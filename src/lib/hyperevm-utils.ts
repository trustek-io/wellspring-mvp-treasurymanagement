import { createPublicClient, http, formatUnits } from "viem"
import { defineChain } from "viem"
import {getEtherscanKey} from '@/lib/sst-resources'

// Define HyperEVM chain
const hyperEVM = defineChain({
    id: 999,
    name: 'HyperEVM',
    network: 'hyperevm',
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
})

// USDT0 contract address on HyperEVM
const USDT0_HYPEREVM = "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb"

// ERC20 ABI for balance checking
const ERC20_ABI = [
    {
        constant: true,
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
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
        name: "symbol",
        outputs: [{ name: "", type: "string" }],
        type: "function"
    },
] as const

/**
 * Get USDT0 balance on HyperEVM
 */
export async function getUSDT0BalanceOnHyperEVM(
    accountAddress: `0x${string}`
): Promise<{
    balance: bigint
    formatted: string
    decimals: number
}> {
    console.log("🔍 Checking USDT0 balance on HyperEVM for:", accountAddress)

    try {
        // Create public client for HyperEVM
        const publicClient = createPublicClient({
            chain: hyperEVM,
            transport: http("https://rpc.hyperliquid.xyz/evm"),
        })

        // Get balance and decimals
        const [balance, decimals] = await Promise.all([
            publicClient.readContract({
                address: USDT0_HYPEREVM as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [accountAddress],
            }),
            publicClient.readContract({
                address: USDT0_HYPEREVM as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'decimals',
            })
        ]) as [bigint, number]

        const formatted = formatUnits(balance, decimals)

        console.log("✅ USDT0 Balance on HyperEVM:", formatted, "USDT0")

        return {
            balance,
            formatted,
            decimals
        }

    } catch (error) {
        console.error("❌ Error checking USDT0 balance on HyperEVM:", error)
        throw error
    }
}

/**
 * Get both ETH and USDT0 balances on HyperEVM
 */
export async function getHyperEVMBalances(
    accountAddress: `0x${string}`
): Promise<{
    eth: { balance: bigint; formatted: string }
    usdt0: { balance: bigint; formatted: string; decimals: number }
}> {
    console.log("💰 Checking all balances on HyperEVM for:", accountAddress)

    try {
        const publicClient = createPublicClient({
            chain: hyperEVM,
            transport: http("https://rpc.hyperliquid.xyz/evm"),
        })

        // Get ETH balance
        const ethBalance = await publicClient.getBalance({
            address: accountAddress,
        })

        // Get USDT0 balance
        const usdt0Data = await getUSDT0BalanceOnHyperEVM(accountAddress)

        const result = {
            eth: {
                balance: ethBalance,
                formatted: formatUnits(ethBalance, 18)
            },
            usdt0: usdt0Data
        }

        console.log("✅ HyperEVM Balances:", {
            ETH: result.eth.formatted,
            USDT0: result.usdt0.formatted
        })

        return result

    } catch (error) {
        console.error("❌ Error checking HyperEVM balances:", error)
        throw error
    }
}


type EtherscanTokenTx = {
    blockNumber: string
    timeStamp: string
    hash: string
    from: string
    to: string
    contractAddress: string
    value: string
    tokenDecimal: string
}

const HYPEREVM_CHAIN_ID = 999
const HYPURR_MARKET = "0x34E3d3834B79D77d8558307535Cdf4871B64Bc65"
const USDT0_TOKEN = "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb"

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
}

/**
 * Sum all USDT0 deposits into Hypurr market (to=HYPURR_MARKET) on HyperEVM,
 * optionally only counting deposits sent from `walletAddress`.
 *
 * If you want to sum deposits from *any* sender, pass `fromFilter = "any"`.
 */
export async function sumUsdt0DepositsToHypurr({
                                                   walletAddress,
                                                   fromFilter = "wallet", // "wallet" | "any"
                                                   startblock = 0,
                                                   endblock = 99_999_999,
                                                   pageSize = 1000,
                                                   maxPages = 200, // safety guard
                                               }: {
    walletAddress: `0x${string}`
    fromFilter?: "wallet" | "any"
    apiKey?: string
    startblock?: number
    endblock?: number
    pageSize?: number
    maxPages?: number
}): Promise<{
    totalRaw: bigint
    totalFormatted: string
    txCount: number
    pagesFetched: number
}> {
    const base = "https://api.etherscan.io/v2/api"
    const addrLower = walletAddress.toLowerCase()
    const marketLower = HYPURR_MARKET.toLowerCase()
    const usdt0Lower = USDT0_TOKEN.toLowerCase()
    const apiKey = await getEtherscanKey()

    let page = 1
    let total: bigint = 0n
    let count = 0
    let pagesFetched = 0

    // De-dupe by (hash, contractAddress, to, value, timeStamp) in case of repeats
    const seen = new Set<string>()

    while (page <= maxPages) {
        const params = new URLSearchParams({
            chainid: String(HYPEREVM_CHAIN_ID),
            module: "account",
            action: "tokentx",
            address: walletAddress,
            startblock: String(startblock),
            endblock: String(endblock),
            sort: "desc",
            page: String(page),
            offset: String(pageSize),
            apikey: apiKey,
        })

        const url = `${base}?${params.toString()}`
        const res = await fetch(url)
        if (!res.ok) {
            // brief backoff & retry on transient HTTP issues
            await sleep(600)
            continue
        }

        const json = await res.json() as {
            status: "0" | "1"
            message: string
            result: EtherscanTokenTx[] | string
        }

        // Handle rate limit / empty gracefully
        if (json.status === "0") {
            const msg = (json.message || "").toLowerCase()
            if (msg.includes("rate limit") || msg.includes("max rate")) {
                await sleep(1000) // gentle backoff
                continue
            }
            // "No transactions found"
            if (Array.isArray(json.result) && json.result.length === 0) break
            if (!Array.isArray(json.result)) break
        }

        if (!Array.isArray(json.result) || json.result.length === 0) break

        pagesFetched++

        for (const tx of json.result) {
            // Only USDT0 transfers into Hypurr market
            const isUsdt0 = tx.contractAddress.toLowerCase() === usdt0Lower
            const isToMarket = tx.to.toLowerCase() === marketLower
            const isFromWallet = fromFilter === "any" ? true : tx.from.toLowerCase() === addrLower

            if (!(isUsdt0 && isToMarket && isFromWallet)) continue

            const key = `${tx.hash}:${tx.contractAddress}:${tx.to}:${tx.value}:${tx.timeStamp}`
            if (seen.has(key)) continue
            seen.add(key)

            try {
                total += BigInt(tx.value)
                count++
            } catch {
                // ignore malformed rows
            }
        }

        // If fewer than a full page returned, we reached the end.
        if (json.result.length < pageSize) break

        page++
        // polite pacing to avoid throttling
        await sleep(250)
    }

    return {
        totalRaw: total,
        totalFormatted: formatUnits(total, 6),
        txCount: count,
        pagesFetched,
    }
}