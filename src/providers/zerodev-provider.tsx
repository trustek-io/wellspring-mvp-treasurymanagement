"use client"

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
    type ReactNode,
} from "react"
import { TurnkeyBrowserClient } from "@turnkey/sdk-browser"
import { useTurnkey } from "@turnkey/sdk-react"
import { useUser } from "@/hooks/use-user"
import { useWallets } from "@/providers/wallet-provider"
import { useLDFlags } from "@/providers/launchdarkly-dashboard-provider"
import {
    createSponsoredSmartAccount,
    getSmartAccountInfo,
    testSponsoredTransaction,
    type ZeroDevClients,
    type SmartAccountInfo,
} from "@/lib/zerodev-client"
import { SMART_ACCOUNT_STATUS } from "@/lib/constants"
import { getCrossChainManager } from "@/lib/simplified-cross-chain-manager"
import { formatUnits } from "viem"
import { getTurnkeyArbitrumWalletClient } from "@/lib/web3"
import { sendUSDCFromTurnkeyWallet } from "@/lib/unified-session-key-system"
import {
    executeAutomatedBridgeAndSupply,
    executeAutomatedHypurrDeposit,
    executeAutomatedUSDTToUSDT0Bridge,
} from "@/actions/automation"


type SmartAccountStatus = (typeof SMART_ACCOUNT_STATUS)[keyof typeof SMART_ACCOUNT_STATUS]

interface ZeroDevState {
    smartAccount: ZeroDevClients | null
    smartAccountInfo: SmartAccountInfo | null
    smartAccountStatus: SmartAccountStatus
    isCreatingAccount: boolean
    isLoadingBalance: boolean
    isSendingTransaction: boolean
    error: string | null
}

type Action =
    | { type: "SET_SMART_ACCOUNT"; payload: ZeroDevClients | null }
    | { type: "SET_SMART_INFO"; payload: SmartAccountInfo | null }
    | { type: "SET_STATUS"; payload: SmartAccountStatus }
    | { type: "SET_LOADING"; payload: { field: keyof ZeroDevState; value: boolean } }
    | { type: "SET_ERROR"; payload: string | null }

const initialState: ZeroDevState = {
    smartAccount: null,
    smartAccountInfo: null,
    smartAccountStatus: SMART_ACCOUNT_STATUS.NOT_DEPLOYED,
    isCreatingAccount: false,
    isLoadingBalance: false,
    isSendingTransaction: false,
    error: null,
}

function reducer(state: ZeroDevState, action: Action): ZeroDevState {
    switch (action.type) {
        case "SET_SMART_ACCOUNT":
            return { ...state, smartAccount: action.payload }
        case "SET_SMART_INFO":
            return {
                ...state,
                smartAccountInfo: action.payload,
                smartAccountStatus: action.payload?.isDeployed
                    ? SMART_ACCOUNT_STATUS.DEPLOYED
                    : SMART_ACCOUNT_STATUS.NOT_DEPLOYED,
            }
        case "SET_STATUS":
            return { ...state, smartAccountStatus: action.payload }
        case "SET_LOADING":
            return { ...state, [action.payload.field]: action.payload.value }
        case "SET_ERROR":
            return { ...state, error: action.payload }
        default:
            return state
    }
}

interface Ctx {
    state: ZeroDevState
    manager: ReturnType<typeof getCrossChainManager>
    managerReady: boolean
    refreshBalances: () => Promise<void>
    testSponsoredTx: () => Promise<string | null>
    clearError: () => void
}

const ZeroDevContext = createContext<Ctx | undefined>(undefined)

export function ZeroDevProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState)

    const { user } = useUser()
    const subOrgId = user?.organization?.organizationId
    const { state: walletState } = useWallets()
    const { indexedDbClient: client } = useTurnkey()

    // Get LaunchDarkly flags for auto-deposit control
    const { flags, isReady: ldReady } = useLDFlags()
    const isAutoDepositEnabled = flags.autoDepositEnabled ?? true // Default to true if flag not set

    // Single shared manager
    const manager = useMemo(() => getCrossChainManager(), [])
    const [managerReady, setManagerReady] = useState(false)

    // prevent duplicate automation runs
    const automationRunningRef = useRef(false)
    const automationDoneRef = useRef(false)

    // Optional: expose a manual trigger later if needed
    const runAutomation = useCallback(async () => {
        if (automationRunningRef.current || automationDoneRef.current) return

        // Check if auto-deposit is enabled via LaunchDarkly
        if (!isAutoDepositEnabled) {
            console.log("🚫 Auto-deposit is disabled via LaunchDarkly flag")
            automationDoneRef.current = true // Mark as done to prevent retries
            return
        }

        automationRunningRef.current = true
        try {
            // Preconditions
            if (!managerReady) return
            if (!state.smartAccountInfo?.address) return
            if (!walletState.selectedAccount?.address) return
            if (!client || !subOrgId) return

            console.log("🤖 Auto-deposit enabled, running automation...")

            // 1) If EOA has USDC, push it to the Smart Account
            const eoaUSDC = walletState.selectedAccount.usdcBalance ?? 0n
            if (eoaUSDC > 0n) {
                const publicClient = manager.clients.arbitrum.publicClient
                const walletClient = await getTurnkeyArbitrumWalletClient(
                    client as TurnkeyBrowserClient,
                    walletState.selectedAccount.address as `0x${string}`
                )
                await sendUSDCFromTurnkeyWallet({
                    publicClient,
                    walletClient,
                    recipientAddress: state.smartAccountInfo.address as `0x${string}`,
                    usdcAmount: formatUnits(eoaUSDC, 6), // viem BigInt → decimal string
                })
            }

            // 2) Read balances from the configured manager
            const bals = await manager.getBalances()
            const usdcSmart = parseFloat(bals.arbitrum?.USDC?.formatted || "0")
            const usdtSmart = parseFloat(bals.arbitrum?.USDT?.formatted || "0")
            const usdt0     = parseFloat(bals.hyperevm?.USDT0?.formatted || "0")

            // 3) Kick off the actions (same logic you had on the page)
            const saAddr = state.smartAccountInfo.address
            if (usdcSmart > 0) {
                await executeAutomatedBridgeAndSupply(subOrgId, saAddr, String(usdcSmart))
            }
            if (usdtSmart > 0) {
                await executeAutomatedUSDTToUSDT0Bridge(subOrgId, saAddr)
            }
            if (usdt0 > 0) {
                await executeAutomatedHypurrDeposit(subOrgId, saAddr, String(usdt0))
            }

            // Optional: one-shot by default; set to false if you want it to repeat when balances change
            automationDoneRef.current = true
        } catch (e) {
            console.error("automation error:", e)
            // do not mark done; allow retry on next readiness cycle if you want
        } finally {
            automationRunningRef.current = false
        }
    }, [managerReady, state.smartAccountInfo?.address, walletState.selectedAccount?.address, client, subOrgId, manager, isAutoDepositEnabled])


    // reentrancy guard
    const inflight = useRef({ smart: false, sk: false, boot: false })

    // --- Core steps (provider-private) ---

    const ensureSmartAccount = useCallback(async () => {
        if (inflight.current.smart) return
        inflight.current.smart = true
        try {
            if (!client || !walletState.selectedAccount || !subOrgId) return

            if (!state.smartAccount) {
                dispatch({ type: "SET_LOADING", payload: { field: "isCreatingAccount", value: true } })
                dispatch({ type: "SET_STATUS", payload: SMART_ACCOUNT_STATUS.DEPLOYING })

                const { getSignerFromZeroDevProvider } = await import("@/lib/session-key-utils")
                const signer = await getSignerFromZeroDevProvider(user, walletState, client)

                const sa = await createSponsoredSmartAccount({ signer, sponsorGas: true })
                dispatch({ type: "SET_SMART_ACCOUNT", payload: sa })

                const info = await getSmartAccountInfo(sa.publicClient, sa.kernelAccount.address)
                dispatch({ type: "SET_SMART_INFO", payload: info })
            }
        } catch (e: any) {
            dispatch({ type: "SET_ERROR", payload: e instanceof Error ? e.message : "Smart account error" })
            dispatch({ type: "SET_STATUS", payload: SMART_ACCOUNT_STATUS.ERROR })
        } finally {
            inflight.current.smart = false
            dispatch({ type: "SET_LOADING", payload: { field: "isCreatingAccount", value: false } })
        }
    }, [client, walletState.selectedAccount, subOrgId, state.smartAccount, user, walletState])

    const ensureSessionKeys = useCallback(async () => {
        if (inflight.current.sk) return
        inflight.current.sk = true
        try {
            if (!client || !walletState.selectedAccount || !subOrgId) return
            const addr = state.smartAccountInfo?.address
            if (!addr) return

            const { getSignerFromZeroDevProvider } = await import("@/lib/session-key-utils")
            const signer = await getSignerFromZeroDevProvider(user, walletState, client)

            // Idempotent manager setup (reuses existing keys if present)
            await manager.setupForChains(
                ["arbitrum", "hyperevm"],
                signer,
                walletState.selectedAccount.address,
                addr,
                subOrgId
            )

            setManagerReady(manager.isReady(["arbitrum", "hyperevm"]))

        } catch (e: any) {
            dispatch({ type: "SET_ERROR", payload: e instanceof Error ? e.message : "Session key setup failed" })
        } finally {
            inflight.current.sk = false
        }
    }, [client, walletState.selectedAccount, subOrgId, state.smartAccountInfo?.address, manager, user, walletState])

    // --- Auto-boot when everything needed is present ---
    useEffect(() => {
        const boot = async () => {
            if (inflight.current.boot) return
            if (!user || !subOrgId || !client || !walletState.selectedAccount) return
            inflight.current.boot = true
            try {
                await ensureSmartAccount()
                await ensureSessionKeys()
            } finally {
                inflight.current.boot = false
            }
        }
        boot()
    }, [user, subOrgId, client, walletState.selectedAccount, ensureSmartAccount, ensureSessionKeys])

    useEffect(() => {
        // Run when everything is ready; idempotent via refs
        // Also wait for LaunchDarkly to be ready before making the decision
        if (managerReady && state.smartAccountInfo?.address && walletState.selectedAccount?.address && client && subOrgId && ldReady) {
            runAutomation()
        }
    }, [managerReady, state.smartAccountInfo?.address, walletState.selectedAccount?.address, client, subOrgId, runAutomation, ldReady])


    const refreshBalances = useCallback(async () => {
        try {
            if (!state.smartAccount || !state.smartAccountInfo) return
            dispatch({ type: "SET_LOADING", payload: { field: "isLoadingBalance", value: true } })
            const info = await getSmartAccountInfo(
                state.smartAccount.publicClient,
                state.smartAccountInfo.address
            )
            dispatch({ type: "SET_SMART_INFO", payload: info })
        } catch (e: any) {
            dispatch({ type: "SET_ERROR", payload: e instanceof Error ? e.message : "Refresh balances failed" })
        } finally {
            dispatch({ type: "SET_LOADING", payload: { field: "isLoadingBalance", value: false } })
        }
    }, [state.smartAccount, state.smartAccountInfo])

    const testSponsoredTx = useCallback(async () => {
        if (!state.smartAccount) return null
        dispatch({ type: "SET_LOADING", payload: { field: "isSendingTransaction", value: true } })
        try {
            const hash = await testSponsoredTransaction(state.smartAccount.kernelClient)
            await refreshBalances()
            return hash
        } catch (e: any) {
            dispatch({ type: "SET_ERROR", payload: e instanceof Error ? e.message : "Test TX failed" })
            return null
        } finally {
            dispatch({ type: "SET_LOADING", payload: { field: "isSendingTransaction", value: false } })
        }
    }, [state.smartAccount, refreshBalances])

    const clearError = useCallback(() => dispatch({ type: "SET_ERROR", payload: null }), [])

    const ctx: Ctx = { state, manager, managerReady, refreshBalances, testSponsoredTx, clearError }
    return <ZeroDevContext.Provider value={ctx}>{children}</ZeroDevContext.Provider>
}

export function useZeroDev() {
    const ctx = useContext(ZeroDevContext)
    if (!ctx) throw new Error("useZeroDev must be used within ZeroDevProvider")
    return ctx
}
