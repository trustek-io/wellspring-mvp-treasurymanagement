// src/lib/unified-session-key-system.ts

import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
    addressToEmptyAccount,
} from "@zerodev/sdk"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    createPublicClient,
    http,
    encodeFunctionData,
    parseUnits,
    formatUnits,
    type Chain,
    type Address, getAddress, formatEther, isAddress,
} from 'viem'
import { arbitrum } from "viem/chains"
import {
    generatePrivateKey,
    privateKeyToAccount,
} from "viem/accounts"
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants"

// Import permissions system
import { toECDSASigner } from "@zerodev/permissions/signers"
import { toSudoPolicy } from "@zerodev/permissions/policies"
import {
    ModularSigner,
    deserializePermissionAccount,
    serializePermissionAccount,
    toPermissionValidator,
} from "@zerodev/permissions"

// Import HYPURR ABI from JSON file
import hypurrMarketAbi from '@/lib/usdt0_usol_pair_abi.json'
import {USDC_ABI} from '@/lib/zerodev-constants'
import {getArbitrumPublicClient} from '@/lib/web3'
import { sumUsdt0DepositsToHypurr } from "./hyperevm-utils"

// Chain configurations
export interface ChainConfig {
    chain: Chain
    zeroDevConfig: {
        rpcUrl: string
        projectId: string
    }
    contracts: {
        [key: string]: {
            address: Address
            abi: any[]
        }
    }
}

// Define HyperEVM chain
export const hyperEVM = {
    id: 999,
    name: 'HyperEVM',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: {
            http: ["https://rpc.hyperliquid.xyz/evm"],
        },
        public: {
            http: ["https://rpc.hyperliquid.xyz/evm"],
        },
    },
    blockExplorers: {
        default: {
            name: 'HyperEVM Explorer',
            url: 'https://explorer.hyperliquid.xyz',
        },
    },
} as const satisfies Chain


export const UNISWAP_ROUTER_ABI = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "address", "name": "tokenIn", "type": "address" },
                    { "internalType": "address", "name": "tokenOut", "type": "address" },
                    { "internalType": "uint24", "name": "fee", "type": "uint24" },
                    { "internalType": "address", "name": "recipient", "type": "address" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" },
                    { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
                    { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
                    { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
                ],
                "internalType": "struct ISwapRouter.ExactInputSingleParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "exactInputSingle",
        "outputs": [
            { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
        ],
        "stateMutability": "payable",
        "type": "function"
    }
]

export const USDT0_ROUTER_ABI = [
    {
        "inputs": [
            { "internalType": "uint16", "name": "_dstChainId", "type": "uint16" }
        ],
        "name": "swapUSDTForUSDT0OnOtherChain",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
]

export const OUPGRADEABLE_ABI = [
    {
        "type": "function",
        "name": "quoteOFT",
        "inputs": [
            {
                "components": [
                    { "name": "dstEid", "type": "uint32" },
                    { "name": "to", "type": "bytes32" },
                    { "name": "amountLD", "type": "uint256" },
                    { "name": "minAmountLD", "type": "uint256" },
                    { "name": "composeMsg", "type": "bytes" },
                    { "name": "oftCmd", "type": "bytes" },
                    { "name": "extraOptions", "type": "bytes" }
                ],
                "internalType": "struct SendParam",
                "name": "sendParam",
                "type": "tuple"
            }
        ],
        "outputs": [
            {
                "components": [
                    { "name": "nativeFee", "type": "uint256" },
                    { "name": "lzFee", "type": "uint256" }
                ],
                "name": "",
                "type": "tuple"
            },
            {
                "components": [
                    { "name": "code", "type": "int256" },
                    { "name": "reason", "type": "string" }
                ],
                "name": "",
                "type": "tuple[]"
            },
            {
                "components": [
                    { "name": "amountSD", "type": "uint256" },
                    { "name": "minAmountSD", "type": "uint256" }
                ],
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "quoteSend",
        "inputs": [
            {
                "components": [
                    { "name": "dstEid", "type": "uint32" },
                    { "name": "to", "type": "bytes32" },
                    { "name": "amountLD", "type": "uint256" },
                    { "name": "minAmountLD", "type": "uint256" },
                    { "name": "composeMsg", "type": "bytes" },
                    { "name": "oftCmd", "type": "bytes" },
                    { "name": "extraOptions", "type": "bytes" }
                ],
                "internalType": "struct SendParam",
                "name": "sendParam",
                "type": "tuple"
            },
            { "name": "payInLzToken", "type": "bool" }
        ],
        "outputs": [
            {
                "components": [
                    { "name": "nativeFee", "type": "uint256" },
                    { "name": "lzFee", "type": "uint256" }
                ],
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "send",
        "inputs": [
            {
                "components": [
                    { "name": "dstEid", "type": "uint32" },
                    { "name": "to", "type": "bytes32" },
                    { "name": "amountLD", "type": "uint256" },
                    { "name": "minAmountLD", "type": "uint256" },
                    { "name": "composeMsg", "type": "bytes" },
                    { "name": "oftCmd", "type": "bytes" },
                    { "name": "extraOptions", "type": "bytes" }
                ],
                "internalType": "struct SendParam",
                "name": "sendParam",
                "type": "tuple"
            },
            {
                "components": [
                    { "name": "nativeFee", "type": "uint256" },
                    { "name": "lzFee", "type": "uint256" }
                ],
                "internalType": "struct MessagingFee",
                "name": "msgFee",
                "type": "tuple"
            },
            { "name": "refundAddress", "type": "address" }
        ],
        "outputs": [
            {
                "components": [
                    { "name": "guid", "type": "bytes32" },
                    { "name": "nonce", "type": "uint64" },
                    {
                        "components": [
                            { "name": "amountSD", "type": "uint256" },
                            { "name": "minAmountSD", "type": "uint256" }
                        ],
                        "name": "amount",
                        "type": "tuple"
                    }
                ],
                "name": "",
                "type": "tuple"
            },
            {
                "components": [
                    { "name": "nativeFee", "type": "uint256" },
                    { "name": "lzFee", "type": "uint256" }
                ],
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "payable"
    }
]

export const ERC20_ABI = [
    {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "approve",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },
]



// Chain configurations
export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
    arbitrum: {
        chain: arbitrum,
        zeroDevConfig: {
            rpcUrl: process.env.NEXT_PUBLIC_ZERODEV_ARBITRUM_RPC || "",
            projectId: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || "",
        },
        contracts: {
            UNISWAP_ROUTER: {
                address: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap V3 Router2
                abi: UNISWAP_ROUTER_ABI
            },
            USDT: {
                address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
                abi: ERC20_ABI
            },
            // USDT0_ROUTER: {
            //     address: "0x4a196ad6DaAe0E5e1D303e8D3Ad23eEC8a5B3e76",
            //     abi: USDT0_ROUTER_ABI // from https://docs.usdt0.to
            // },
            USDT0_OFT: {
                address: "0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92",
                abi: OUPGRADEABLE_ABI
            },
            USDC: {
                address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                abi: [
                    {
                        constant: false,
                        inputs: [
                            { name: "spender", type: "address" },
                            { name: "amount", type: "uint256" }
                        ],
                        name: "approve",
                        outputs: [{ name: "", type: "bool" }],
                        type: "function"
                    },
                    {
                        constant: true,
                        inputs: [],
                        name: "decimals",
                        outputs: [{ name: "", type: "uint8" }],
                        type: "function"
                    },
                    {
                        constant: true,
                        inputs: [],
                        name: "decimals",
                        outputs: [{ name: "", type: "uint8" }],
                        type: "function"
                    },
                    {
                        constant: true,
                        inputs: [
                            { name: "owner", type: "address" },
                            { name: "spender", type: "address" }
                        ],
                        name: "allowance",
                        outputs: [{ name: "", type: "uint256" }],
                        type: "function"
                    },
                    {
                        constant: true,
                        inputs: [{ name: "account", type: "address" }],
                        name: "balanceOf",
                        outputs: [{ name: "", type: "uint256" }],
                        type: "function"
                    },
                    {
                        constant: false,
                        inputs: [
                            { name: "to", type: "address" },
                            { name: "amount", type: "uint256" }
                        ],
                        name: "transfer",
                        outputs: [{ name: "", type: "bool" }],
                        type: "function"
                    },
                ] as const
            }
        }
    },
    hyperevm: {
        chain: hyperEVM,
        zeroDevConfig: {
            rpcUrl: process.env.NEXT_PUBLIC_ZERODEV_HYPEREVM_RPC || "https://rpc.hyperliquid.xyz/evm",
            projectId: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || "",
        },
        contracts: {
            USDT0: {
                address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
                abi: [
                    {
                        constant: false,
                        inputs: [
                            { name: "spender", type: "address" },
                            { name: "amount", type: "uint256" }
                        ],
                        name: "approve",
                        outputs: [{ name: "", type: "bool" }],
                        type: "function"
                    },
                    {
                        constant: true,
                        inputs: [
                            { name: "owner", type: "address" },
                            { name: "spender", type: "address" }
                        ],
                        name: "allowance",
                        outputs: [{ name: "", type: "uint256" }],
                        type: "function"
                    },
                    {
                        constant: true,
                        inputs: [{ name: "account", type: "address" }],
                        name: "balanceOf",
                        outputs: [{ name: "", type: "uint256" }],
                        type: "function"
                    },
                    {
                        constant: false,
                        inputs: [
                            { name: "to", type: "address" },
                            { name: "amount", type: "uint256" }
                        ],
                        name: "transfer",
                        outputs: [{ name: "", type: "bool" }],
                        type: "function"
                    },
                ] as const
            },
            HYPURR_MARKET: {
                address: "0x34E3d3834B79D77d8558307535Cdf4871B64Bc65",
                abi: hypurrMarketAbi as any[]
            }
        }
    }
}

// Unified session key data structure
export interface UnifiedSessionKeyData {
    address: Address
    privateKey: `0x${string}`
    chains: Record<string, {
        smartAccountAddress: Address
        serializedSessionKey?: string
        isApproved: boolean
        sessionKeyId?: string
        address: Address
        privateKey: `0x${string}`
    }>
}

// Unified session key client
export interface UnifiedSessionKeyClient {
    chainId: string
    sessionKeyAccount: any
    kernelClient: any
    sessionKeySigner: any
    publicClient: any
    config: ChainConfig
}

/**
 * Create a session key pair that can be used across multiple chains
 */
export function createUnifiedSessionKeyPair(): Pick<UnifiedSessionKeyData, 'address' | 'privateKey'> {
    console.log("🔑 Creating unified session key pair...")

    const sessionPrivateKey = generatePrivateKey()
    const sessionKeyAccount = privateKeyToAccount(sessionPrivateKey)
    const sessionKeyAddress = sessionKeyAccount.address

    console.log("✅ Unified session key created:", sessionKeyAddress)

    return {
        address: sessionKeyAddress,
        privateKey: sessionPrivateKey,
    }
}

/**
 * Approve session key for a specific chain
 */
export async function approveSessionKeyForChain(
    sessionKeyData: Pick<UnifiedSessionKeyData, 'address' | 'privateKey'>,
    chainId: string,
    ownerSigner: any,
    permissions: any = {}
): Promise<string> {
    console.log(`👤 Approving session key for chain: ${chainId}`)

    const config = CHAIN_CONFIGS[chainId]
    if (!config) {
        throw new Error(`Unsupported chain: ${chainId}`)
    }

    try {
        const entryPoint = getEntryPoint("0.7")

        // Create public client for the chain
        const publicClient = createPublicClient({
            chain: config.chain,
            transport: http(),
        })

        // Create owner's ECDSA validator
        const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
            signer: ownerSigner,
            entryPoint,
            kernelVersion: KERNEL_V3_1,
        })

        // Create empty account for session key
        const emptyAccount = addressToEmptyAccount(sessionKeyData.address)
        const emptySessionKeySigner = await toECDSASigner({ signer: emptyAccount })

        // Create permission validator with policies
        const permissionPlugin = await toPermissionValidator(publicClient, {
            entryPoint,
            signer: emptySessionKeySigner,
            policies: [
                toSudoPolicy({}), // You can customize policies per chain
            ],
            kernelVersion: KERNEL_V3_1,
        })

        // Create kernel account with both validators
        const sessionKeyAccount = await createKernelAccount(publicClient, {
            plugins: {
                sudo: ecdsaValidator,
                regular: permissionPlugin,
            },
            entryPoint,
            kernelVersion: KERNEL_V3_1,
        })

        // Serialize the permission account
        const serializedSessionKey = await serializePermissionAccount(sessionKeyAccount)

        console.log(`✅ Session key approved for ${chainId}`)
        return serializedSessionKey

    } catch (error) {
        console.error(`❌ Error approving session key for ${chainId}:`, error)
        throw error
    }
}

/**
 * Create session key client for a specific chain
 */
export async function createSessionKeyClientForChain(
    sessionKeyData: Pick<UnifiedSessionKeyData, 'address' | 'privateKey'>,
    chainId: string,
    serializedSessionKey: string
): Promise<UnifiedSessionKeyClient> {
    console.log(`🤖 Creating session key client for chain: ${chainId}`)

    const config = CHAIN_CONFIGS[chainId]
    if (!config) {
        throw new Error(`Unsupported chain: ${chainId}`)
    }

    try {
        const entryPoint = getEntryPoint("0.7")

        // Create the session key account and signer
        const sessionKeyAccount = privateKeyToAccount(sessionKeyData.privateKey)
        const sessionKeySigner = await toECDSASigner({
            signer: sessionKeyAccount,
        })

        // Create public client
        const publicClient = createPublicClient({
            chain: config.chain,
            transport: http(),
        })

        // Deserialize permission account
        const permissionAccount = await deserializePermissionAccount(
            publicClient,
            entryPoint,
            KERNEL_V3_1,
            serializedSessionKey,
            sessionKeySigner
        )

        // Create kernel client
        const kernelPaymaster = config.zeroDevConfig.rpcUrl && config.zeroDevConfig.projectId ?
            createZeroDevPaymasterClient({
                chain: config.chain,
                transport: http(config.zeroDevConfig.rpcUrl),
            }) : undefined

        const kernelClient = createKernelAccountClient({
            account: permissionAccount,
            chain: config.chain,
            bundlerTransport: http(config.zeroDevConfig.rpcUrl),
            paymaster: kernelPaymaster ? {
                getPaymasterData(userOperation) {
                    return kernelPaymaster.sponsorUserOperation({ userOperation })
                },
            } : undefined,
            userOperation: {
                estimateFeesPerGas: async () => ({
                    maxFeePerGas: BigInt(0),
                    maxPriorityFeePerGas: BigInt(0),
                }),
            },
        })

        console.log(`✅ Session key client created for ${chainId}`)

        return {
            chainId,
            sessionKeyAccount: permissionAccount,
            kernelClient,
            sessionKeySigner,
            publicClient,
            config,
        }

    } catch (error) {
        console.error(`❌ Error creating session key client for ${chainId}:`, error)
        throw error
    }
}

/**
 * Generic token transfer function that works on any configured chain
 */
export async function sendTokenTransfer(
    client: UnifiedSessionKeyClient,
    tokenName: string,
    to: Address,
    amount: string,
    decimals: number = 6
): Promise<string> {
    console.log(`💸 Sending ${tokenName} transfer on ${client.chainId}...`)
    console.log(`📍 To: ${to}`)
    console.log(`💰 Amount: ${amount} ${tokenName}`)

    const tokenContract = client.config.contracts[tokenName]
    if (!tokenContract) {
        throw new Error(`Token ${tokenName} not configured for chain ${client.chainId}`)
    }

    try {
        const amountWei = parseUnits(amount, decimals)

        const userOpHash = await client.kernelClient.sendUserOperation({
            callData: await client.kernelClient.account.encodeCalls([
                {
                    to: tokenContract.address,
                    value: BigInt(0),
                    data: encodeFunctionData({
                        abi: tokenContract.abi,
                        functionName: "transfer",
                        args: [to, amountWei],
                    }),
                },
            ]),
        })

        const receipt = await client.kernelClient.waitForUserOperationReceipt({
            hash: userOpHash,
        })

        console.log(`✅ ${tokenName} transfer completed:`, receipt.receipt.transactionHash)
        return receipt.receipt.transactionHash

    } catch (error) {
        console.error(`❌ Error in ${tokenName} transfer:`, error)
        throw error
    }
}

/**
 * Generic token approval function
 */
export async function sendTokenApproval(
    client: UnifiedSessionKeyClient,
    tokenName: string,
    spender: Address,
    amount: string,
    decimals: number = 6
): Promise<string> {
    console.log(`✅ Approving ${tokenName} on ${client.chainId} for $${amount} ...`)

    const tokenContract = client.config.contracts[tokenName]
    if (!tokenContract) {
        throw new Error(`Token ${tokenName} not configured for chain ${client.chainId}`)
    }

    try {
        const amountWei = parseUnits(amount, decimals)

        const userOpHash = await client.kernelClient.sendUserOperation({
            callData: await client.kernelClient.account.encodeCalls([
                {
                    to: tokenContract.address,
                    value: BigInt(0),
                    data: encodeFunctionData({
                        abi: tokenContract.abi,
                        functionName: "approve",
                        args: [spender, amountWei],
                    }),
                },
            ]),
        })

        const receipt = await client.kernelClient.waitForUserOperationReceipt({
            hash: userOpHash,
        })

        console.log(`✅ ${tokenName} approval completed:`, receipt.receipt.transactionHash)
        return receipt.receipt.transactionHash

    } catch (error) {
        console.error(`❌ Error in ${tokenName} approval:`, error)
        throw error
    }
}

/**
 * Deposit to Hypurr market (HyperEVM specific)
 */
export async function sendHypurrDeposit(
    client: UnifiedSessionKeyClient,
    amount: string,
    receiver?: Address
): Promise<{ approvalTxHash?: string; depositTxHash: string }> {
    if (client.chainId !== 'hyperevm') {
        throw new Error('Hypurr deposits only available on HyperEVM')
    }

    console.log(`🏦 Depositing to Hypurr market: ${amount} USDT0`)

    const smartAccountAddress = client.kernelClient.account.address
    const receiverAddress = receiver || smartAccountAddress
    const amountWei = parseUnits(amount, 6) // USDT0 has 6 decimals

    const usdt0Contract = client.config.contracts.USDT0
    const hypurrContract = client.config.contracts.HYPURR_MARKET

    try {
        // Check current allowance
        const currentAllowance = await client.publicClient.readContract({
            address: usdt0Contract.address,
            abi: usdt0Contract.abi,
            functionName: 'allowance',
            args: [smartAccountAddress, hypurrContract.address],
        })

        let approvalTxHash: string | undefined

        // Approve if necessary
        if (currentAllowance < amountWei) {
            console.log("🔓 Approving USDT0 for Hypurr market...")
            approvalTxHash = await sendTokenApproval(
                client,
                'USDT0',
                hypurrContract.address,
                amount
            )
        }

        // Deposit to market
        console.log("🏦 Depositing to Hypurr market...")
        const depositUserOpHash = await client.kernelClient.sendUserOperation({
            callData: await client.kernelClient.account.encodeCalls([
                {
                    to: hypurrContract.address,
                    value: BigInt(0),
                    data: encodeFunctionData({
                        abi: hypurrContract.abi,
                        functionName: "deposit",
                        args: [amountWei, receiverAddress],
                    }),
                },
            ]),
        })

        const depositReceipt = await client.kernelClient.waitForUserOperationReceipt({
            hash: depositUserOpHash,
        })

        const depositTxHash = depositReceipt.receipt.transactionHash
        console.log("✅ Hypurr deposit completed:", depositTxHash)

        return {
            approvalTxHash,
            depositTxHash,
        }

    } catch (error) {
        console.error("❌ Error in Hypurr deposit:", error)
        throw error
    }
}

/**
 * Get token balance for any configured token on any chain
 */
export async function getTokenBalance(
    client: UnifiedSessionKeyClient,
    tokenName: string,
    accountAddress: Address
): Promise<{
    balance: bigint
    formatted: string
    decimals: number
}> {
    const tokenContract = client.config.contracts[tokenName]
    if (!tokenContract) {
        throw new Error(`Token ${tokenName} not configured for chain ${client.chainId}`)
    }

    try {
        const balance = await client.publicClient.readContract({
            address: tokenContract.address,
            abi: tokenContract.abi,
            functionName: 'balanceOf',
            args: [accountAddress],
        })

        // Get proper decimals for the token
        let decimals: number
        try {
            decimals = await client.publicClient.readContract({
                address: tokenContract.address,
                abi: tokenContract.abi,
                functionName: 'decimals',
            }) as number
        } catch (error) {
            // Fallback decimals based on token type
            if (tokenName === 'USDC' || tokenName === 'USDT0' || tokenName === 'USDT') {
                decimals = 6 // USDC and USDT0 have 6 decimals
            } else {
                decimals = 18 // Default for ETH-like tokens
            }
        }

        const formatted = formatUnits(balance, decimals)

        // console.log(`💰 ${tokenName} balance:`, {
        //     balance: balance.toString(),
        //     decimals,
        //     formatted
        // })

        return {
            balance,
            formatted,
            decimals
        }

    } catch (error) {
        console.error(`❌ Error getting ${tokenName} balance:`, error)
        throw error
    }
}



function formatAmount(amountBigInt: bigint, decimals = 6, fixed = 6) {
    const decimalsNum = Number(decimals)
    const amountStr = amountBigInt.toString().padStart(decimalsNum + 1, '0')
    const whole = amountStr.slice(0, -decimalsNum) || '0'
    const fraction = amountStr.slice(-decimalsNum).padEnd(fixed, '0').slice(0, fixed)
    return `${whole}.${fraction}`
}

export async function getHypurrUsolMarketSummary(address: `0x${string}`) {
    const RPC_URL = "https://rpc.hyperliquid.xyz/evm"
    const MARKET_ADDRESS = "0x34E3d3834B79D77d8558307535Cdf4871B64Bc65"

    const ABI = [
        {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "", type: "uint256" }]
        },
        {
            name: "pricePerShare",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ name: "", type: "uint256" }]
        },
        {
            name: "decimals",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ name: "", type: "uint8" }]
        }
    ] as const

    const client = createPublicClient({ transport: http(RPC_URL) })

    // Query the contract
    const shares: bigint = await client.readContract({
        address: MARKET_ADDRESS,
        abi: ABI,
        functionName: "balanceOf",
        args: [address],
    })
    const pricePerShare: bigint = await client.readContract({
        address: MARKET_ADDRESS,
        abi: ABI,
        functionName: "pricePerShare"
    })
    const shareDecimals: number = await client.readContract({
        address: MARKET_ADDRESS,
        abi: ABI,
        functionName: "decimals"
    })

    const assetDecimals = 6 // USDT0
    const priceDecimals = 18 // Always 18 for pricePerShare

    // To get USDT0 value: shares * pricePerShare / 10^(shareDecimals + priceDecimals - assetDecimals)
    const scale = 10n ** BigInt(Number(shareDecimals) + Number(priceDecimals) - assetDecimals)
    const value = shares * pricePerShare / scale

    // Principal is just: shares / 1e6 (USDT0 units)
    const principal = shares / (10n ** BigInt(shareDecimals))

    // JS math: get principal/value/yield in float
    const principalNum = Number(shares) / 10 ** Number(shareDecimals)
    const valueNum = Number(value) / 10 ** assetDecimals
    const yieldNum = valueNum - principalNum

    const { totalFormatted } = await sumUsdt0DepositsToHypurr({
        walletAddress: address,
    })
    const actualYield = Number(valueNum.toFixed(6)) - Number(totalFormatted)

    // All return values as object:
    return {
        userAddress: address,
        sharesHeld: formatAmount(shares, shareDecimals),
        pricePerShare: formatAmount(pricePerShare, priceDecimals),
        currentValue: valueNum.toFixed(6),
        principal: principalNum.toFixed(6),
        yield: yieldNum.toFixed(6),
        rawShares: shares.toString(),
        rawPricePerShare: pricePerShare.toString(),
        shareDecimals,
        priceDecimals,
        // Add raw value for code/tests if needed
        currentValueRaw: value,
        principalRaw: principal,
        yieldRaw: yieldNum,
        actualYield: actualYield
    }
}

export async function sendUSDCFromTurnkeyWallet({
                                                    publicClient,
                                                    walletClient,
                                                    recipientAddress,
                                                    usdcAmount, // in decimal form, e.g. 1.5 for 1.5 USDC
                                                }: {
    publicClient: any
    walletClient: any
    recipientAddress: string
    usdcAmount: string
}) {

    try {
        console.log('🚀 Starting USDC gas estimation example...')

        const gasEstimate = await estimateUSDCTransferGas(
            walletClient.account.address as Address,
            recipientAddress as Address,
            usdcAmount,
        )

        if (!gasEstimate.canAfford) {
            console.log('Funding gas:', gasEstimate.totalGasCostFormatted, 'ETH')
            const { fundEthArb } = await import('@/actions/web3')
            await fundEthArb(walletClient.account.address, gasEstimate.totalGasCostFormatted)
        }


        const encodedData = encodeFunctionData({
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [recipientAddress, parseUnits(usdcAmount, 6)],
        })

        const txRequest = await walletClient.prepareTransactionRequest({
            to: getAddress(CHAIN_CONFIGS.arbitrum.contracts.USDC.address),
            data: encodedData,
        })

        // 3. Send it
        const hash = await walletClient.sendTransaction(txRequest)
        await new Promise(resolve => setTimeout(resolve, 4000))
        console.log('!!!! success', hash)
        return hash
    } catch (error) {
        console.error('❌ Example failed:', error)
    }
    return
}


const USDC_ARBITRUM_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const


interface GasEstimateResult {
    canAfford: boolean
    gasLimit: bigint
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
    totalGasCost: bigint
    totalGasCostFormatted: string
    totalGasCostUSD?: number
    ethBalance: bigint
    ethBalanceFormatted: string
    ethShortfall?: bigint
    ethShortfallFormatted?: string
    estimationError?: string
}

export const estimateUSDCTransferGas = async (
    fromAddress: Address,
    toAddress: Address,
    usdcAmount: string,
    ethPrice?: number
): Promise<GasEstimateResult> => {
    try {
        // Validate inputs first
        if (!fromAddress || fromAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error('Invalid fromAddress: cannot be null or zero address')
        }

        if (!isAddress(fromAddress)) {
            throw new Error(`Invalid fromAddress format: ${fromAddress}`)
        }

        if (!toAddress || toAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error('Invalid toAddress: cannot be null or zero address')
        }

        if (!isAddress(toAddress)) {
            throw new Error(`Invalid toAddress format: ${toAddress}`)
        }

        if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
            throw new Error('Invalid USDC amount: must be greater than 0')
        }

        console.log('✅ Gas estimation inputs validated:', {
            fromAddress,
            toAddress,
            usdcAmount,
            usdcAmountType: typeof usdcAmount
        })

        const publicClient = getArbitrumPublicClient()

        // Parse USDC amount (6 decimals)
        const tokenAmount = parseUnits(usdcAmount, 6)
        console.log('📊 Parsed token amount:', tokenAmount.toString(), `(${usdcAmount} USDC)`)

        // Get current ETH balance
        const ethBalance = await publicClient.getBalance({ address: fromAddress })
        console.log('💰 ETH Balance:', formatEther(ethBalance), 'ETH')

        // Encode the transfer function call
        const transferData = encodeFunctionData({
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [toAddress, tokenAmount],
        })

        console.log('📝 Transfer data encoded:', transferData)
        console.log('🎯 Contract address:', USDC_ARBITRUM_ADDRESS)

        // Estimate gas and get fee data in parallel
        console.log('⚡ Starting gas estimation...')

        const [gasEstimate, feeData] = await Promise.all([
            publicClient.estimateGas({
                account: fromAddress,    // ✅ Use 'account' not 'from'
                to: USDC_ARBITRUM_ADDRESS,
                data: transferData,
                value: BigInt(0),        // ✅ Explicit 0 for ERC20 transfers
            }).catch((error) => {
                // If gas estimation fails, provide a reasonable fallback
                console.error("💥 Gas estimation failed:", error)
                console.error("🔍 Estimation params:", {
                    to: USDC_ARBITRUM_ADDRESS,
                    data: transferData,
                    from: fromAddress,
                })

                // Check if it's a specific error we can handle
                if (error.message.includes('insufficient funds')) {
                    console.log('💡 Insufficient funds detected - using fallback gas estimate')
                } else if (error.message.includes('zero address')) {
                    console.log('💡 Zero address error - check your addresses')
                } else if (error.message.includes('execution reverted')) {
                    console.log('💡 Execution reverted - might be balance or allowance issue')
                }

                return BigInt(65000) // Standard ERC20 transfer gas limit
            }),
            publicClient.estimateFeesPerGas().catch((error) => {
                console.error("💥 Fee estimation failed:", error)
                return {
                    maxFeePerGas: BigInt(100000000), // 0.1 gwei fallback
                    maxPriorityFeePerGas: BigInt(0)
                }
            })
        ])

        console.log('⛽ Gas estimate:', gasEstimate.toString())
        console.log('💸 Fee data:', {
            maxFeePerGas: feeData.maxFeePerGas?.toString(),
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
        })

        // Add 20% buffer to gas estimate for safety
        const gasLimit = gasEstimate + (gasEstimate * BigInt(20)) / BigInt(100)
        const maxFeePerGas = feeData.maxFeePerGas || BigInt(100000000) // 0.1 gwei fallback
        const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || BigInt(0)

        // Calculate total gas cost
        const totalGasCost = gasLimit * maxFeePerGas
        const totalGasCostFormatted = formatEther(totalGasCost)

        console.log('💰 Gas calculations:', {
            gasLimit: gasLimit.toString(),
            maxFeePerGas: maxFeePerGas.toString(),
            totalGasCost: totalGasCost.toString(),
            totalGasCostFormatted: totalGasCostFormatted
        })

        // Check if user can afford the gas
        const canAfford = ethBalance >= totalGasCost

        console.log('✅ Can afford gas?', canAfford)
        if (!canAfford) {
            const shortfall = totalGasCost - ethBalance
            console.log('❌ ETH shortfall:', formatEther(shortfall), 'ETH')
        }

        const result: GasEstimateResult = {
            canAfford,
            gasLimit,
            maxFeePerGas,
            maxPriorityFeePerGas,
            totalGasCost,
            totalGasCostFormatted,
            ethBalance,
            ethBalanceFormatted: formatEther(ethBalance),
        }

        // Add USD conversion if price provided
        if (ethPrice) {
            result.totalGasCostUSD = parseFloat(totalGasCostFormatted) * ethPrice
            console.log('💵 Gas cost in USD:', result.totalGasCostUSD?.toFixed(4))
        }

        // Calculate shortfall if insufficient
        if (!canAfford) {
            result.ethShortfall = totalGasCost - ethBalance
            result.ethShortfallFormatted = formatEther(result.ethShortfall)
        }

        console.log('🎉 Gas estimation completed successfully')
        return result

    } catch (error) {
        console.error("💥 Gas estimation error:", error)

        // Return conservative estimates if estimation fails
        const fallbackGasLimit = BigInt(65000)
        const fallbackMaxFeePerGas = BigInt(200000000) // 0.2 gwei (conservative)
        const fallbackTotalCost = fallbackGasLimit * fallbackMaxFeePerGas

        console.log('🔄 Using fallback estimates:', {
            gasLimit: fallbackGasLimit.toString(),
            maxFeePerGas: fallbackMaxFeePerGas.toString(),
            totalCost: formatEther(fallbackTotalCost)
        })

        return {
            canAfford: false,
            gasLimit: fallbackGasLimit,
            maxFeePerGas: fallbackMaxFeePerGas,
            maxPriorityFeePerGas: BigInt(0),
            totalGasCost: fallbackTotalCost,
            totalGasCostFormatted: formatEther(fallbackTotalCost),
            ethBalance: BigInt(0),
            ethBalanceFormatted: "0",
            ethShortfall: fallbackTotalCost,
            ethShortfallFormatted: formatEther(fallbackTotalCost),
            estimationError: error instanceof Error ? error.message : "Unknown estimation error"
        }
    }
}