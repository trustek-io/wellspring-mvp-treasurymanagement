import { fundWallet as serverFundWallet } from "@/actions/turnkey"
import { TurnkeyBrowserClient } from "@turnkey/sdk-browser"
import { TurnkeyServerClient } from "@turnkey/sdk-server"
import { createAccount } from "@turnkey/viem"
import { WalletInterface } from "@turnkey/wallet-stamper"
import {
  Alchemy,
  AlchemyMinedTransactionsAddress,
  AlchemySubscription,
  AssetTransfersCategory,
  Network,
} from "alchemy-sdk"
import {
  Account,
  Address,
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  parseEther,
  PublicClient,
  WalletClient,
  webSocket,
} from "viem"
import { sepolia, arbitrum } from "viem/chains"

import { env } from "@/env.mjs"
import type { AlchemyMinedTransaction, Transaction } from "@/types/web3"
import { turnkeyConfig } from "@/config/turnkey"
import { zeroDevConfig } from "@/config/zerodev"

import { showTransactionToast } from "./toast"
import { truncateAddress } from "./utils"

// USDC contract address on Arbitrum mainnet
const USDC_ARBITRUM_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const

// USDC ABI (minimal - just what we need for balance)
const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
] as const

let publicClient: PublicClient
let arbitrumPublicClient: PublicClient

export const getPublicClient = () => {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: sepolia,
      transport: http(turnkeyConfig.rpcUrl),
    })
  }
  return publicClient
}

export const getArbitrumPublicClient = () => {
  if (!arbitrumPublicClient) {
    arbitrumPublicClient = createPublicClient({
      chain: arbitrum,
      transport: http(`https://arb-mainnet.g.alchemy.com/v2/${env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
    })
  }
  return arbitrumPublicClient
}

// ZeroDev Public Client (for smart accounts)
export const getZeroDevArbitrumPublicClient = () => {
  return createPublicClient({
    chain: zeroDevConfig.chain,
    transport: http(zeroDevConfig.rpcUrl),
  })
}

const settings = {
  apiKey: env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.ETH_SEPOLIA,
}

const arbitrumSettings = {
  apiKey: env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.ARB_MAINNET,
}

const alchemy = new Alchemy(settings)
const arbitrumAlchemy = new Alchemy(arbitrumSettings)

export const watchMinedTransactions = (
    address: Address,
    callback: (tx: Transaction) => void
) => {
  const addressPairs: [
    AlchemyMinedTransactionsAddress,
    ...AlchemyMinedTransactionsAddress[],
  ] = [{ from: address }, { to: address }] as [
    AlchemyMinedTransactionsAddress,
    ...AlchemyMinedTransactionsAddress[],
  ]

  alchemy.ws.on(
      {
        method: AlchemySubscription.MINED_TRANSACTIONS,
        addresses: addressPairs,
        includeRemoved: true,
        hashesOnly: false,
      },
      ({ transaction }: AlchemyMinedTransaction) => {
        // Convert addresses to checksummed addresses before comparison
        const { from, to } = {
          from: getAddress(transaction.from),
          to: getAddress(transaction.to),
        }
        const txn: Transaction = {
          hash: transaction.hash,
          blockNumber: parseInt(transaction.blockNumber, 16),
          value: BigInt(transaction.value),
          from,
          to,
          status: from === address ? "sent" : "received",
          timestamp: new Date().toISOString(),
        }

        callback?.(txn)
      }
  )
  return () => {
    alchemy.ws.off(AlchemySubscription.MINED_TRANSACTIONS)
  }
}

let webSocketClient: PublicClient

const getWebSocketClient = () => {
  if (!webSocketClient) {
    webSocketClient = createPublicClient({
      chain: sepolia,
      transport: webSocket("wss://ethereum-sepolia-rpc.publicnode.com"),
    })
  }
  return webSocketClient
}

export const watchPendingTransactions = (
    address: Address,
    callback: (tx: any) => void
) => {
  const webSocketClient = getWebSocketClient()
  const publicClient = getPublicClient()
  const unwatch = webSocketClient.watchPendingTransactions({
    onTransactions: (hashes) => {
      hashes.forEach(async (hash) => {
        const tx = await publicClient.getTransaction({ hash })
        if (tx && (tx.from === address || tx.to === address)) {
          callback(tx)
        }
      })
    },
  })

  return unwatch
}

export const fundWallet = async (address: Address) => {
  const fundingAmountText = "0.01 ETH"

  try {
    const publicClient = getPublicClient()
    const hash = await serverFundWallet(address)

    if (hash === "") {
      throw new Error("unable to drip from faucet. You may be dripped out 💧")
    }

    const toastId = showTransactionToast({
      hash,
      title: "Funding wallet...",
      description: `Sending ${fundingAmountText} to ${truncateAddress(address)}`,
      type: "loading",
    })

    const transaction = await publicClient.waitForTransactionReceipt({
      hash,
    })

    showTransactionToast({
      id: toastId,
      hash,
      title: "Funds received! 🎉",
      description: `Wallet funded with ${fundingAmountText}`,
      type: "success",
    })

    return transaction
  } catch (error: unknown) {
    console.error("Error funding wallet:", error)

    showTransactionToast({
      title: "Error funding wallet",
      description:
          "Please try again or use https://www.alchemy.com/faucets/ethereum-sepolia",
      type: "error",
    })

    throw error
  }
}

export const getBalance = async (address: Address) => {
  const publicClient = getPublicClient()
  const balance = await publicClient.getBalance({
    address,
  })

  return balance
}

export const getUSDCBalance = async (address: Address): Promise<bigint> => {
  const arbitrumClient = getArbitrumPublicClient()

  try {
    const balance = await arbitrumClient.readContract({
      address: USDC_ARBITRUM_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address],
    })

    return balance as bigint
  } catch (error) {
    console.error("Error fetching USDC balance:", error)
    return BigInt(0)
  }
}

export const getUSDCDecimals = async (): Promise<number> => {
  const arbitrumClient = getArbitrumPublicClient()

  try {
    const decimals = await arbitrumClient.readContract({
      address: USDC_ARBITRUM_ADDRESS,
      abi: USDC_ABI,
      functionName: 'decimals',
    })

    return decimals as number
  } catch (error) {
    console.error("Error fetching USDC decimals:", error)
    return 6 // USDC typically has 6 decimals
  }
}

// Utility function to format USDC balance (6 decimals)
export const formatUSDC = (balance: bigint, decimals: number = 6): string => {
  const divisor = BigInt(10 ** decimals)
  const wholePart = balance / divisor
  const fractionalPart = balance % divisor

  if (fractionalPart === BigInt(0)) {
    return wholePart.toString()
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  const trimmedFractional = fractionalStr.replace(/0+$/, '')

  return `${wholePart}.${trimmedFractional}`
}

export const getTransactions = async (
    address: Address
): Promise<Transaction[]> => {
  // Fetch sent and received transactions concurrently
  const [sentResponse, receivedResponse] = await Promise.all([
    alchemy.core.getAssetTransfers({
      fromAddress: address,
      excludeZeroValue: false,
      category: [
        AssetTransfersCategory.ERC20,
        AssetTransfersCategory.EXTERNAL,
        AssetTransfersCategory.INTERNAL,
      ],
      withMetadata: true,
    }),
    alchemy.core.getAssetTransfers({
      toAddress: address,
      excludeZeroValue: false,
      category: [
        AssetTransfersCategory.ERC20,
        AssetTransfersCategory.EXTERNAL,
        AssetTransfersCategory.INTERNAL,
      ],
      withMetadata: true,
    }),
  ])

  // Combine and map the responses
  const transactions = [
    ...sentResponse.transfers.map(
        ({ blockNum, from, to, hash, value, metadata }) => ({
          blockNumber: Number(blockNum),
          from: getAddress(from),
          to: to ? getAddress(to) : null,
          hash,
          value: value ? parseEther(value.toString()) : null,
          status: "sent" as const,
          timestamp: metadata.blockTimestamp,
        })
    ),
    ...receivedResponse.transfers.map(
        ({ blockNum, from, to, hash, value, metadata }) => ({
          blockNumber: Number(blockNum),
          from: getAddress(from),
          to: to ? getAddress(to) : null,
          hash,
          value: value ? parseEther(value.toString()) : null,
          status: "received" as const,
          timestamp: metadata.blockTimestamp,
        })
    ),
  ]

  // Sort transactions by block number in descending order
  transactions.sort((a, b) => b.blockNumber - a.blockNumber)

  return transactions
}

export const getArbitrumTransactions = async (
    address: Address
): Promise<Transaction[]> => {
  // Fetch sent and received transactions on Arbitrum
  const [sentResponse, receivedResponse] = await Promise.all([
    arbitrumAlchemy.core.getAssetTransfers({
      fromAddress: address,
      excludeZeroValue: false,
      category: [
        AssetTransfersCategory.ERC20,
        AssetTransfersCategory.EXTERNAL,
        AssetTransfersCategory.INTERNAL,
      ],
      withMetadata: true,
    }),
    arbitrumAlchemy.core.getAssetTransfers({
      toAddress: address,
      excludeZeroValue: false,
      category: [
        AssetTransfersCategory.ERC20,
        AssetTransfersCategory.EXTERNAL,
        AssetTransfersCategory.INTERNAL,
      ],
      withMetadata: true,
    }),
  ])

  // Combine and map the responses
  const transactions = [
    ...sentResponse.transfers.map(
        ({ blockNum, from, to, hash, value, metadata }) => ({
          blockNumber: Number(blockNum),
          from: getAddress(from),
          to: to ? getAddress(to) : null,
          hash,
          value: value ? parseEther(value.toString()) : null,
          status: "sent" as const,
          timestamp: metadata.blockTimestamp,
        })
    ),
    ...receivedResponse.transfers.map(
        ({ blockNum, from, to, hash, value, metadata }) => ({
          blockNumber: Number(blockNum),
          from: getAddress(from),
          to: to ? getAddress(to) : null,
          hash,
          value: value ? parseEther(value.toString()) : null,
          status: "received" as const,
          timestamp: metadata.blockTimestamp,
        })
    ),
  ]

  // Sort transactions by block number in descending order
  transactions.sort((a, b) => b.blockNumber - a.blockNumber)

  return transactions
}

/**
 * Creates and returns a wallet client for interacting with the Turnkey API using a specified account.
 *
 * @param {TurnkeyBrowserClient} turnkeyClient - The Turnkey client instance used for the API connection.
 * @param {string} signWith - The Turnkey wallet account address or private key ID used to sign transactions
 * @returns {Promise<WalletClient>} A promise that resolves to the wallet client configured for the specified account and chain.
 */
export const getTurnkeyWalletClient = async (
    turnkeyClient: TurnkeyBrowserClient | TurnkeyServerClient,
    signWith: string
) => {
  // Create a new account using the provided Turnkey client and the specified account for signing
  const turnkeyAccount = await createAccount({
    // @ts-ignore - need to reconcile the TurnkeySDKClientConfig type between the sdk-server & sdk-browser SDKw
    client: turnkeyClient,
    organizationId: process.env.ORGANIZATION_ID!,
    signWith,
  })

  // Create a wallet client using the newly created account, targeting the Sepolia chain
  const client = createWalletClient({
    account: turnkeyAccount as Account,
    chain: sepolia,
    transport: http(turnkeyConfig.rpcUrl),
  })

  return client
}

export const getTurnkeyArbitrumWalletClient = async (
    turnkeyClient: TurnkeyBrowserClient | TurnkeyServerClient,
    signWith: string
) => {
  // Create a new account using the provided Turnkey client and the specified account for signing
  const turnkeyAccount = await createAccount({
    // @ts-ignore - need to reconcile the TurnkeySDKClientConfig type between the sdk-server & sdk-browser SDKw
    client: turnkeyClient,
    organizationId: process.env.ORGANIZATION_ID!,
    signWith,
  })

  // Create a wallet client using the newly created account, targeting Arbitrum
  const client = createWalletClient({
    account: turnkeyAccount as Account,
    chain: arbitrum,
    transport: http(`https://arb-mainnet.g.alchemy.com/v2/${env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
  })

  return client
}

// ZeroDev Integration: Get Turnkey account signer for smart accounts
export const getTurnkeySignerForZeroDev = async (
    turnkeyClient: TurnkeyBrowserClient | TurnkeyServerClient,
    signWith: string,
    subOrgId: string
): Promise<Account> => {
  console.log("🔑 Getting Turnkey signer for ZeroDev integration")

  const turnkeyAccount = await createAccount({
    // @ts-ignore - need to reconcile the TurnkeySDKClientConfig type between the sdk-server & sdk-browser SDKw
    client: turnkeyClient,
    organizationId: subOrgId,
    signWith,
  })

  console.log("✅ Turnkey signer created for ZeroDev, address:", turnkeyAccount.address)
  return turnkeyAccount as Account
}

let injectedClient: WalletClient
export const getInjectedWalletClient = async (signWith: string) => {
  if (!injectedClient) {
    const [account] = await window.ethereum!.request({
      method: "eth_requestAccounts",
    })

    const client = createWalletClient({
      account,
      chain: sepolia,
      transport: http(),
    })

    injectedClient = client
  }

  return injectedClient
}