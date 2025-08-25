"use client"

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react"
import { server } from "@/actions"
import { useRouter } from "next/navigation"
import {
  DEFAULT_ETHEREUM_ACCOUNTS,
  defaultEthereumAccountAtIndex,
  TurnkeyBrowserClient,
} from "@turnkey/sdk-browser"
import { useTurnkey } from "@turnkey/sdk-react"
import { useLocalStorage } from "usehooks-ts"
import { getAddress, isAddress } from "viem"

import { Account, Wallet } from "@/types/turnkey"
import { getBalance, getUSDCBalance } from "@/lib/web3"
import { useUser } from "@/hooks/use-user"

interface WalletsState {
  loading: boolean
  error: string
  wallets: Wallet[]
  selectedWallet: Wallet | null
  selectedAccount: Account | null
}

type Action =
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "SET_ERROR"; payload: string }
    | { type: "SET_WALLETS"; payload: Wallet[] }
    | { type: "SET_SELECTED_WALLET"; payload: Wallet }
    | { type: "SET_SELECTED_ACCOUNT"; payload: Account }
    | { type: "ADD_WALLET"; payload: Wallet }
    | { type: "ADD_ACCOUNT"; payload: Account }
    | {
  type: "UPDATE_ACCOUNT_BALANCES"
  payload: { address: string; ethBalance: bigint; usdcBalance: bigint }
}

const WalletsContext = createContext<
    | {
  state: WalletsState
  dispatch: React.Dispatch<Action>
  newWallet: (walletName?: string) => Promise<void>
  newWalletAccount: () => Promise<void>
  selectWallet: (wallet: Wallet) => void
  selectAccount: (account: Account) => void
  refreshBalances: () => Promise<void>
}
    | undefined
>(undefined)

function walletsReducer(state: WalletsState, action: Action): WalletsState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    case "SET_WALLETS":
      return { ...state, wallets: action.payload }
    case "SET_SELECTED_WALLET":
      return { ...state, selectedWallet: action.payload }
    case "SET_SELECTED_ACCOUNT":
      return { ...state, selectedAccount: action.payload }
    case "ADD_WALLET":
      return { ...state, wallets: [...state.wallets, action.payload] }
    case "ADD_ACCOUNT":
      if (state.selectedWallet) {
        const updatedWallets = state.wallets.map((wallet) => {
          if (wallet.walletId === state.selectedWallet?.walletId) {
            const accountExists = wallet.accounts.some(
                (account) => account.address === action.payload.address
            )
            if (!accountExists) {
              return { ...wallet, accounts: [...wallet.accounts, action.payload] }
            }
          }
          return wallet
        })
        const selectedWallet = updatedWallets.find(
            (wallet) => wallet.walletId === state.selectedWallet?.walletId
        )
        return { ...state, wallets: updatedWallets, selectedWallet: selectedWallet || state.selectedWallet }
      }
      return state
    case "UPDATE_ACCOUNT_BALANCES":
      const updatedWallets = state.wallets.map((wallet) => ({
        ...wallet,
        accounts: wallet.accounts.map((account) => {
          if (account.address === action.payload.address) {
            return {
              ...account,
              balance: action.payload.ethBalance,
              usdcBalance: action.payload.usdcBalance,
            }
          }
          return account
        }),
      }))
      const updatedSelectedWallet = state.selectedWallet
          ? {
            ...state.selectedWallet,
            accounts: state.selectedWallet.accounts.map((account) => {
              if (account.address === action.payload.address) {
                return {
                  ...account,
                  balance: action.payload.ethBalance,
                  usdcBalance: action.payload.usdcBalance,
                }
              }
              return account
            }),
          }
          : null
      const updatedSelectedAccount =
          state.selectedAccount?.address === action.payload.address
              ? {
                ...state.selectedAccount,
                balance: action.payload.ethBalance,
                usdcBalance: action.payload.usdcBalance,
              }
              : state.selectedAccount
      return {
        ...state,
        wallets: updatedWallets,
        selectedWallet: updatedSelectedWallet,
        selectedAccount: updatedSelectedAccount,
      }
    default:
      return state
  }
}

const initialState: WalletsState = {
  loading: false,
  error: "",
  wallets: [],
  selectedWallet: null,
  selectedAccount: null,
}

async function getWalletsWithAccounts(
    browserClient: TurnkeyBrowserClient,
    organizationId: string
): Promise<Wallet[]> {
  const { wallets } = await browserClient.getWallets()
  return await Promise.all(
      wallets.map(async (wallet) => {
        const { accounts } = await browserClient.getWalletAccounts({
          walletId: wallet.walletId,
        })

        const accountsWithBalance = await accounts.reduce<Promise<Account[]>>(
            async (accPromise, { address, ...account }) => {
              const acc = await accPromise
              if (account.organizationId === organizationId && isAddress(address)) {
                const checksumAddress = getAddress(address)
                const [ethBalance, usdcBalance] = await Promise.all([
                  getBalance(checksumAddress),
                  getUSDCBalance(checksumAddress),
                ])
                acc.push({
                  ...account,
                  address: checksumAddress,
                  balance: ethBalance,
                  usdcBalance,
                } as Account)
              }
              return acc
            },
            Promise.resolve([])
        )

        return { ...wallet, accounts: accountsWithBalance }
      })
  )
}

export function WalletsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(walletsReducer, initialState)
  const { indexedDbClient: client } = useTurnkey()
  const { user } = useUser()
  const router = useRouter()
  const [preferredWallet, setPreferredWallet] = useLocalStorage("PREFERRED_WALLET_KEY", {
    userId: "",
    walletId: "",
  } as { userId: string; walletId: string })

  useEffect(() => {
    if (state.selectedWallet) {
      selectAccount(state.selectedWallet.accounts[0])
    }
  }, [state.selectedWallet])

  const refreshBalances = async () => {
    if (!state.selectedAccount?.address) return
    try {
      const [ethBalance, usdcBalance] = await Promise.all([
        getBalance(state.selectedAccount.address),
        getUSDCBalance(state.selectedAccount.address),
      ])
      dispatch({
        type: "UPDATE_ACCOUNT_BALANCES",
        payload: {
          address: state.selectedAccount.address,
          ethBalance,
          usdcBalance,
        },
      })
    } catch (error) {
      console.error("Error refreshing balances:", error)
    }
  }

  const newWalletAccount = async () => {
    dispatch({ type: "SET_LOADING", payload: true })
    try {
      if (state.selectedWallet && client) {
        const newAccount = defaultEthereumAccountAtIndex(state.selectedWallet.accounts.length + 1)
        const response = await client.createWalletAccounts({
          walletId: state.selectedWallet.walletId,
          // @ts-ignore (Turnkey typing nuance)
          accounts: [newAccount],
        })
        if (response && user?.organization.organizationId) {
          const address = getAddress(response.addresses[0])
          const [ethBalance, usdcBalance] = await Promise.all([getBalance(address), getUSDCBalance(address)])
          // @ts-ignore
          const account: Account = {
            // @ts-ignore (Turnkey typing nuance)
            ...newAccount,
            organizationId: user?.organization.organizationId,
            walletId: state.selectedWallet?.walletId!,
            createdAt: { seconds: new Date().toISOString(), nanos: new Date().toISOString() } as any,
            updatedAt: { seconds: new Date().toISOString(), nanos: new Date().toISOString() } as any,
            address,
            balance: ethBalance,
            usdcBalance,
          }
          dispatch({ type: "ADD_ACCOUNT", payload: account })
        }
      }
    } catch {
      dispatch({ type: "SET_ERROR", payload: "Failed to create new wallet account" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const newWallet = async (walletName?: string) => {
    dispatch({ type: "SET_LOADING", payload: true })
    try {
      if (client) {
        const { walletId } = await client.createWallet({
          walletName: walletName || "New Wallet",
          // @ts-ignore
          accounts: DEFAULT_ETHEREUM_ACCOUNTS,
        })
        if (walletId && user?.organization.organizationId) {
          const wallet = await server.getWallet(walletId, user?.organization.organizationId)
          dispatch({ type: "ADD_WALLET", payload: wallet })
        }
      }
    } catch {
      dispatch({ type: "SET_ERROR", payload: "Failed to create new wallet" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const selectWallet = (wallet: Wallet) => {
    dispatch({ type: "SET_SELECTED_WALLET", payload: wallet })
    setPreferredWallet({ userId: user?.id || "", walletId: wallet.walletId })
  }

  useEffect(() => {
    const fetchWallets = async () => {
      if (!user?.organization?.organizationId) return
      dispatch({ type: "SET_LOADING", payload: true })
      try {
        if (client) {
          const wallets = await getWalletsWithAccounts(client as TurnkeyBrowserClient, user.organization.organizationId)
          dispatch({ type: "SET_WALLETS", payload: wallets })
          if (wallets.length > 0) {
            let selected = wallets[0]
            if (preferredWallet.userId && preferredWallet.walletId) {
              const found = wallets.find(
                  (w) => w.walletId === preferredWallet.walletId && user?.id === preferredWallet.userId
              )
              if (found) selected = found
            }
            selectWallet(selected)
          }
        } else {
          // fallback to server listing on fresh passkey signups
          const wallets = await server.getWalletsWithAccounts(user.organization.organizationId)
          dispatch({ type: "SET_WALLETS", payload: wallets })
          if (wallets.length > 0) selectWallet(wallets[0])
        }
      } catch {
        dispatch({ type: "SET_ERROR", payload: "Failed to fetch wallets" })
      } finally {
        dispatch({ type: "SET_LOADING", payload: false })
      }
    }
    fetchWallets()
  }, [user, client])

  const selectAccount = async (account: Account) => {
    const [ethBalance, usdcBalance] = await Promise.all([getBalance(account.address), getUSDCBalance(account.address)])
    dispatch({
      type: "SET_SELECTED_ACCOUNT",
      payload: { ...account, balance: ethBalance, usdcBalance },
    })
  }

  const value = {
    state,
    dispatch,
    newWallet,
    newWalletAccount,
    selectWallet,
    selectAccount,
    refreshBalances,
  }

  return <WalletsContext.Provider value={value}>{children}</WalletsContext.Provider>
}

export function useWallets() {
  const context = useContext(WalletsContext)
  if (context === undefined) throw new Error("useWallets must be used within a WalletsProvider")
  return context
}

export { WalletsContext }
