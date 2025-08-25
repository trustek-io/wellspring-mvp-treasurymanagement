"use client"

import { useEffect, useRef, useState } from "react"
import { api } from "@/actions"
import { useWallets } from "@/providers/wallet-provider"
import { useHypurr } from "@/providers/hypurr-provider"
import { useZeroDev } from "@/providers/zerodev-provider"
import { useUser } from "@/hooks/use-user"
import { Card } from "@/components/ui/card"

export default function BarrelHeroCard({ fallbackAPY = 12.3 }: { fallbackAPY?: number }) {
    const { state: walletState } = useWallets()
    const usdcWalletBalance = walletState.selectedAccount?.usdcBalance ?? 0n
    const usdcFromTurnkeyWallet = Number(usdcWalletBalance) / 1e6

    // pull ZeroDev state too so we can show SA address, etc.
    const { state: zeroDevState, manager, managerReady } = useZeroDev()

    const [combinedBalance, setCombinedBalance] = useState(0)
    const [combinedLoading, setCombinedLoading] = useState(true)
    const [breakdown, setBreakdown] = useState<any>(null)

    // extra debug states (the “full” menu content we’re restoring)
    const [debugInfo, setDebugInfo] = useState<{
        eoaAddress?: string | null
        smartAccount?: string | null
        managerReady?: boolean
        status?: { hasSessionKey: boolean; approvedChains: string[] }
        sessionKeyAddress?: string | null
        arbitrum?: {
            ready: boolean
            hasKernelClient: boolean
            hasSessionKeySigner: boolean
            hasPublicClient: boolean
            ethForGas?: string | null
            usdcAllowanceUniswap?: string | null
        }
        hyperevm?: {
            ready: boolean
            hasKernelClient: boolean
            hasSessionKeySigner: boolean
            hasPublicClient: boolean
            ethForGas?: string | null
            usdt0AllowanceHypurr?: string | null
        }
    } | null>(null)

    const [secretModeActive, setSecretModeActive] = useState(false)
    const clickCount = useRef(0)
    const clickTimerRef = useRef<NodeJS.Timeout | null>(null)

    const { user } = useUser()
    const [firstName, setFirstName] = useState<string | null>(null)
    const [userInfoLoading, setUserInfoLoading] = useState(true)

    const { state: hypurrState } = useHypurr()
    const { averageAPY, averageAPYLoading } = hypurrState

    // load balances + rich debug snapshot
    useEffect(() => {
        let stop = false
        const load = async () => {
            if (!managerReady) {
                setCombinedLoading(false)
                // still capture addresses even if not ready
                setDebugInfo({
                    eoaAddress: walletState.selectedAccount?.address ?? null,
                    smartAccount: zeroDevState.smartAccountInfo?.address ?? null,
                    managerReady: false,
                    status: { hasSessionKey: false, approvedChains: [] },
                    sessionKeyAddress: null,
                    arbitrum: {
                        ready: false,
                        hasKernelClient: !!(manager as any)?.clients?.arbitrum?.kernelClient,
                        hasSessionKeySigner: !!(manager as any)?.clients?.arbitrum?.sessionKeySigner,
                        hasPublicClient: !!(manager as any)?.clients?.arbitrum?.publicClient,
                        ethForGas: null,
                        usdcAllowanceUniswap: null,
                    },
                    hyperevm: {
                        ready: false,
                        hasKernelClient: !!(manager as any)?.clients?.hyperevm?.kernelClient,
                        hasSessionKeySigner: !!(manager as any)?.clients?.hyperevm?.sessionKeySigner,
                        hasPublicClient: !!(manager as any)?.clients?.hyperevm?.publicClient,
                        ethForGas: null,
                        usdt0AllowanceHypurr: null,
                    },
                })
                return
            }
            setCombinedLoading(true)
            try {
                const bals = await manager.getBalances()
                if (stop) return
                const usdcSmart = parseFloat(bals.arbitrum?.USDC?.formatted || "0")
                const usdtSmart = parseFloat(bals.arbitrum?.USDT?.formatted || "0")
                const usdt0 = parseFloat(bals.hyperevm?.USDT0?.formatted || "0")
                const usolYield = parseFloat(bals.hyperevm?.USOLMARKET?.currentValue || "0")

                setBreakdown({
                    usdcFromTurnkeyWallet,
                    usdcSmart,
                    usdtSmart,
                    usdt0,
                    usolYield,
                    usolMarketData: bals.hyperevm?.USOLMARKET,
                })
                setCombinedBalance(usdcFromTurnkeyWallet + usdcSmart + usdtSmart + usdt0 + usolYield)

                // ---- restore/collect old hidden menu debug details ----
                const saAddr = zeroDevState.smartAccountInfo?.address as `0x${string}` | undefined
                const eoaAddr = walletState.selectedAccount?.address as `0x${string}` | undefined
                const status = manager.getStatus()
                const skAddr = (manager as any)?.sessionKeyData?.address ?? null

                const arbClient = (manager as any)?.clients?.arbitrum
                const hypClient = (manager as any)?.clients?.hyperevm

                let ethArb: string | null = null
                let ethHyp: string | null = null
                let allowanceUSDC_Uniswap: string | null = null
                let allowanceUSDT0_Hypurr: string | null = null

                if (saAddr && arbClient?.publicClient) {
                    try {
                        const bal = await arbClient.publicClient.getBalance({ address: saAddr })
                        ethArb = (Number(bal) / 1e18).toFixed(6)
                    } catch {}
                    try {
                        // allowance: USDC -> Uniswap V3 Router
                        const usdcAddr = arbClient.config.contracts.USDC.address as `0x${string}`
                        const usdcAbi = arbClient.config.contracts.USDC.abi
                        const uniswap = arbClient.config.contracts.UNISWAP_ROUTER.address as `0x${string}`
                        const alw: bigint = await arbClient.publicClient.readContract({
                            address: usdcAddr,
                            abi: usdcAbi,
                            functionName: "allowance",
                            args: [saAddr, uniswap],
                        })
                        allowanceUSDC_Uniswap = (Number(alw) / 1e6).toFixed(6)
                    } catch {}
                }

                if (saAddr && hypClient?.publicClient) {
                    try {
                        const bal = await hypClient.publicClient.getBalance({ address: saAddr })
                        ethHyp = (Number(bal) / 1e18).toFixed(6)
                    } catch {}
                    try {
                        // allowance: USDT0 -> Hypurr market
                        const usdt0Addr = hypClient.config.contracts.USDT0.address as `0x${string}`
                        const usdt0Abi = hypClient.config.contracts.USDT0.abi
                        const hypurrMarket = hypClient.config.contracts.HYPURR_MARKET.address as `0x${string}`
                        const alw: bigint = await hypClient.publicClient.readContract({
                            address: usdt0Addr,
                            abi: usdt0Abi,
                            functionName: "allowance",
                            args: [saAddr, hypurrMarket],
                        })
                        allowanceUSDT0_Hypurr = (Number(alw) / 1e6).toFixed(6)
                    } catch {}
                }

                setDebugInfo({
                    eoaAddress: eoaAddr ?? null,
                    smartAccount: saAddr ?? null,
                    managerReady: managerReady,
                    status: {
                        hasSessionKey: !!status.hasSessionKey,
                        approvedChains: status.approvedChains ?? [],
                    },
                    sessionKeyAddress: skAddr,
                    arbitrum: {
                        ready: !!arbClient && manager.isReady(["arbitrum"]),
                        hasKernelClient: !!arbClient?.kernelClient,
                        hasSessionKeySigner: !!arbClient?.sessionKeySigner,
                        hasPublicClient: !!arbClient?.publicClient,
                        ethForGas: ethArb,
                        usdcAllowanceUniswap: allowanceUSDC_Uniswap,
                    },
                    hyperevm: {
                        ready: !!hypClient && manager.isReady(["hyperevm"]),
                        hasKernelClient: !!hypClient?.kernelClient,
                        hasSessionKeySigner: !!hypClient?.sessionKeySigner,
                        hasPublicClient: !!hypClient?.publicClient,
                        ethForGas: ethHyp,
                        usdt0AllowanceHypurr: allowanceUSDT0_Hypurr,
                    },
                })
                // -------------------------------------------------------

            } catch (e) {
                console.error("balances:", e)
            } finally {
                if (!stop) setCombinedLoading(false)
            }
        }
        load()
        return () => { stop = true }
    }, [managerReady, manager, usdcFromTurnkeyWallet, walletState.selectedAccount?.address, zeroDevState.smartAccountInfo?.address])

    useEffect(() => {
        const go = async () => {
            if (!user?.organization?.organizationId) { setUserInfoLoading(false); return }
            try {
                setUserInfoLoading(true)
                const info = await api.getUserInfo(user.organization.organizationId)
                setFirstName(info.first_name)
            } catch {
                setFirstName(null)
            } finally {
                setUserInfoLoading(false)
            }
        }
        go()
    }, [user?.organization?.organizationId])

    const handleTotalBalanceClick = () => {
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
        clickCount.current += 1
        if (clickCount.current >= 5) {
            setSecretModeActive((x) => !x)
            clickCount.current = 0
            return
        }
        // @ts-ignore
        clickTimerRef.current = setTimeout(() => { clickCount.current = 0 }, 3000)
    }

    useEffect(() => () => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current) }, [])

    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
    const displayBalance = combinedBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const isBalanceLoading = combinedLoading

    const isAPYLoading = averageAPYLoading
    const hasAverageAPY = averageAPY !== null && !averageAPYLoading
    const hasError = averageAPY === null && !averageAPYLoading
    const displayAPY = hasAverageAPY ? averageAPY : hasError ? fallbackAPY : null

    const formatFirstName = (n: string) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
    const welcomeMessage = userInfoLoading ? "Welcome" : firstName ? `Welcome, ${formatFirstName(firstName)}` : "Welcome"

    const formatBalance = (n: number) =>
        n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const SecretMode = () =>
        !breakdown ? null : (
            <div
                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    secretModeActive ? "max-h-max opacity-100 mt-4" : "max-h-0 opacity-0"
                }`}
            >
                <div className="bg-blue-600/20 rounded-lg p-4 space-y-3 text-sm">
                    {/* --- Balances (previous minimal) --- */}
                    <Section title="Balances">
                        <Row label="Turnkey Wallet USDC" value={`$${formatBalance(breakdown.usdcFromTurnkeyWallet)}`} />
                        <Row label="Smart Account USDC" value={`$${formatBalance(breakdown.usdcSmart)}`} />
                        <Row label="Smart Account USDT" value={`$${formatBalance(breakdown.usdtSmart)}`} />
                        <Row label="HyperEVM USDT0" value={`$${formatBalance(breakdown.usdt0)}`} />
                        <Row label="USOL Market (Value)" value={`$${formatBalance(breakdown.usolYield)}`} />
                        <div className="border-t border-blue-500/30 pt-2 mt-2 font-semibold flex justify-between">
                            <span className="text-blue-100">Total:</span>
                            <span className="font-mono text-white">
                $
                                {formatBalance(
                                    breakdown.usdcFromTurnkeyWallet +
                                    breakdown.usdcSmart +
                                    breakdown.usdtSmart +
                                    breakdown.usdt0 +
                                    breakdown.usolYield
                                )}
              </span>
                        </div>
                    </Section>

                    {/* --- USOL Market details if present --- */}
                    {breakdown.usolMarketData && (
                        <Section title="USOL Market (Details)">
                            <Row label="Shares" value={breakdown.usolMarketData.sharesHeld ?? "—"} />
                            <Row label="Price/Share" value={breakdown.usolMarketData.pricePerShare ?? "—"} />
                            <Row label="Current Value" value={`$${breakdown.usolMarketData.currentValue ?? "—"}`} />
                            <Row label="Principal" value={`$${breakdown.usolMarketData.principal ?? "—"}`} />
                            <Row label="Yield" value={`$${breakdown.usolMarketData.yield ?? "—"}`} />
                        </Section>
                    )}

                    {/* --- Addresses & Status --- */}
                    <Section title="Addresses & Status">
                        <RowMono label="EOA" value={debugInfo?.eoaAddress ?? "—"} />
                        <RowMono label="Smart Account" value={debugInfo?.smartAccount ?? "—"} />
                        <RowMono label="Session Key" value={debugInfo?.sessionKeyAddress ?? "—"} />
                        <Row label="Manager Ready" value={debugInfo?.managerReady ? "Yes ✅" : "No ❌"} />
                        <Row
                            label="Approved Chains"
                            value={(debugInfo?.status?.approvedChains || []).join(", ") || "None"}
                        />
                        <Row label="Session Key Ready" value={debugInfo?.status?.hasSessionKey ? "Yes ✅" : "No ❌"} />
                    </Section>

                    {/* --- Arbitrum Debug --- */}
                    <Section title="Arbitrum (42161)">
                        <Row
                            label="Client"
                            value={
                                debugInfo?.arbitrum?.ready
                                    ? "Ready ✅"
                                    : "Not Ready ❌"
                            }
                        />
                        <Row
                            label="Kernel/Public/Signer"
                            value={[
                                debugInfo?.arbitrum?.hasKernelClient ? "K✅" : "K❌",
                                debugInfo?.arbitrum?.hasPublicClient ? "P✅" : "P❌",
                                debugInfo?.arbitrum?.hasSessionKeySigner ? "S✅" : "S❌",
                            ].join("  ")}
                        />
                        <Row label="ETH (Gas)" value={debugInfo?.arbitrum?.ethForGas ?? "—"} />
                        <Row label="USDC→Uniswap Allowance" value={debugInfo?.arbitrum?.usdcAllowanceUniswap ?? "—"} />
                    </Section>

                    {/* --- HyperEVM Debug --- */}
                    <Section title="HyperEVM (999)">
                        <Row
                            label="Client"
                            value={
                                debugInfo?.hyperevm?.ready
                                    ? "Ready ✅"
                                    : "Not Ready ❌"
                            }
                        />
                        <Row
                            label="Kernel/Public/Signer"
                            value={[
                                debugInfo?.hyperevm?.hasKernelClient ? "K✅" : "K❌",
                                debugInfo?.hyperevm?.hasPublicClient ? "P✅" : "P❌",
                                debugInfo?.hyperevm?.hasSessionKeySigner ? "S✅" : "S❌",
                            ].join("  ")}
                        />
                        <Row label="ETH (Gas)" value={debugInfo?.hyperevm?.ethForGas ?? "—"} />
                        <Row label="USDT0→Hypurr Allowance" value={debugInfo?.hyperevm?.usdt0AllowanceHypurr ?? "—"} />
                    </Section>
                </div>
            </div>
        )

    return (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-wellspring-navy to-wellspring-light p-4 sm:p-6 lg:p-8 text-white shadow-lg">
            {/* Mobile */}
            <div className="block sm:hidden">
                <div className="space-y-4">
                    <h1 className="text-xl font-bold">{welcomeMessage}</h1>
                    <div className="space-y-2">
                        <p className="text-sm text-blue-100 select-none" onClick={handleTotalBalanceClick}>Total Balance</p>
                        <div className="space-y-1">
                            {isBalanceLoading ? <Skeleton w="w-48" h="h-8" /> : (
                                <>
                                    <h2 className="text-3xl font-bold select-none" onClick={handleTotalBalanceClick}>${displayBalance}</h2>
                                    <p className="text-xs text-blue-200">as of {today}</p>
                                </>
                            )}
                        </div>
                        <SecretMode />
                    </div>
                    <APYBlock isAPYLoading={isAPYLoading} displayAPY={displayAPY} hasError={hasError} />
                </div>
            </div>

            {/* Desktop */}
            <div className="hidden sm:flex items-center justify-between">
                <div className="space-y-4">
                    <h1 className="text-2xl lg:text-3xl font-bold">{welcomeMessage}</h1>
                    <div className="space-y-2">
                        <p className="text-lg text-blue-100 select-none" onClick={handleTotalBalanceClick}>Total Balance</p>
                        <div className="space-y-1">
                            {isBalanceLoading ? <Skeleton w="w-64" h="h-12" /> : (
                                <>
                                    <h2 className="text-4xl lg:text-5xl font-bold select-none" onClick={handleTotalBalanceClick}>${displayBalance}</h2>
                                    <p className="text-sm text-blue-200">as of {today}</p>
                                </>
                            )}
                        </div>
                        <SecretMode />
                    </div>
                </div>
                <APYRight isAPYLoading={isAPYLoading} displayAPY={displayAPY} hasError={hasError} />
            </div>
        </Card>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <div className="text-blue-100 font-semibold">{title}</div>
            <div className="space-y-1">{children}</div>
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-blue-200">{label}:</span>
            <span className="font-mono text-white">{value}</span>
        </div>
    )
}

function RowMono({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-blue-200">{label}:</span>
            <span className="font-mono text-white truncate max-w-[60%]">{value}</span>
        </div>
    )
}

function Skeleton({ w, h }: { w: string; h: string }) {
    return (
        <div className="animate-pulse">
            <div className={`mb-2 ${h} ${w} rounded bg-blue-600/30`} />
            <div className="h-3 w-24 rounded bg-blue-600/20" />
        </div>
    )
}

function APYBlock({ isAPYLoading, displayAPY, hasError }:{isAPYLoading:boolean;displayAPY:number|null;hasError:boolean}) {
    return (
        <div className="flex items-center justify-between bg-blue-600/20 rounded-lg p-3">
            <div>
                {isAPYLoading ? <div className="animate-pulse h-3 w-16 rounded bg-blue-600/20" /> :
                    <p className="text-sm text-blue-200">Average APY* {hasError && <span className="block text-xs text-blue-300">(Using fallback rate)</span>}</p>}
            </div>
            <div className="text-right text-2xl font-bold">
                {isAPYLoading ? <div className="animate-pulse h-8 w-16 rounded bg-blue-600/30" /> :
                    displayAPY !== null ? <>{displayAPY.toFixed(2)}%</> :
                        <div className="animate-pulse h-8 w-16 rounded bg-blue-600/30" />}
            </div>
        </div>
    )
}

function APYRight({ isAPYLoading, displayAPY, hasError }:{isAPYLoading:boolean;displayAPY:number|null;hasError:boolean}) {
    return (
        <div className="text-right">
            <div className="mb-2 text-4xl lg:text-6xl font-bold">
                {isAPYLoading ? <div className="animate-pulse h-12 lg:h-16 w-24 lg:w-32 rounded bg-blue-600/30" /> :
                    displayAPY !== null ? <>{displayAPY.toFixed(2)}%</> :
                        <div className="animate-pulse h-12 lg:h-16 w-24 lg:w-32 rounded bg-blue-600/30" />}
            </div>
            {isAPYLoading ? <div className="animate-pulse h-4 w-24 rounded bg-blue-600/20" /> :
                <p className="text-base lg:text-lg italic text-blue-200">
                    Average APY* {hasError && <span className="mt-1 block text-xs text-blue-300">(Using fallback rate)</span>}
                </p>}
        </div>
    )
}
