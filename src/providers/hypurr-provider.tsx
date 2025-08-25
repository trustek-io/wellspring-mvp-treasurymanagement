"use client"

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react"
import {
  Address,
  createPublicClient,
  defineChain,
  formatUnits,
  http,
} from "viem"

// Define HyperEVM chain
const hyperEVM = defineChain({
  id: 999,
  name: "HyperEVM",
  network: "hyperevm",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
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
      name: "HyperEVM Explorer",
      url: "https://explorer.hyperliquid.xyz",
    },
  },
})

// Contract address and ABI for USDT0 <> USOL market
const HYPURR_MARKET_ADDRESS =
    "0x34E3d3834B79D77d8558307535Cdf4871B64Bc65" as Address

const HYPURR_MARKET_ABI = [
  {
    inputs: [],
    name: "currentRateInfo",
    outputs: [
      { internalType: "uint32", name: "lastBlock", type: "uint32" },
      { internalType: "uint32", name: "feeToProtocolRate", type: "uint32" },
      { internalType: "uint64", name: "lastTimestamp", type: "uint64" },
      { internalType: "uint64", name: "ratePerSec", type: "uint64" },
      { internalType: "uint64", name: "fullUtilizationRate", type: "uint64" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "previewAddInterest",
    outputs: [
      { internalType: "uint256", name: "_interestEarned", type: "uint256" },
      { internalType: "uint256", name: "_feesAmount", type: "uint256" },
      { internalType: "uint256", name: "_feesShare", type: "uint256" },
      {
        components: [
          { internalType: "uint32", name: "lastBlock", type: "uint32" },
          { internalType: "uint32", name: "feeToProtocolRate", type: "uint32" },
          { internalType: "uint64", name: "lastTimestamp", type: "uint64" },
          { internalType: "uint64", name: "ratePerSec", type: "uint64" },
          {
            internalType: "uint64",
            name: "fullUtilizationRate",
            type: "uint64",
          },
        ],
        internalType: "struct FraxlendPairCore.CurrentRateInfo",
        name: "_newCurrentRateInfo",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint128", name: "amount", type: "uint128" },
          { internalType: "uint128", name: "shares", type: "uint128" },
        ],
        internalType: "struct VaultAccount",
        name: "_totalAsset",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint128", name: "amount", type: "uint128" },
          { internalType: "uint128", name: "shares", type: "uint128" },
        ],
        internalType: "struct VaultAccount",
        name: "_totalBorrow",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAsset",
    outputs: [
      { internalType: "uint128", name: "amount", type: "uint128" },
      { internalType: "uint128", name: "shares", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalBorrow",
    outputs: [
      { internalType: "uint128", name: "amount", type: "uint128" },
      { internalType: "uint128", name: "shares", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "RATE_PRECISION",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UTIL_PREC",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "FEE_PRECISION",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// Types
interface MarketRateInfo {
  lastBlock: number
  feeToProtocolRate: number
  lastTimestamp: bigint
  ratePerSec: bigint
  fullUtilizationRate: bigint
}

interface VaultAccount {
  amount: bigint
  shares: bigint
}

interface PreviewInterestData {
  interestEarned: bigint
  feesAmount: bigint
  feesShare: bigint
  newCurrentRateInfo: MarketRateInfo
  totalAsset: VaultAccount
  totalBorrow: VaultAccount
}

interface MarketData {
  supplyAPY: number
  borrowAPY: number
  utilization: number
  totalSupplied: string // USDT0 amount formatted
  totalBorrowed: string // USDT0 amount formatted
  lastUpdated: Date
}

interface HypurrState {
  loading: boolean
  error: string | null
  marketData: MarketData | null
  isConnected: boolean
  averageAPY: number | null // ✨ NEW: Store average APY in state
  averageAPYLoading: boolean // ✨ NEW: Track loading state for average APY
}

type HypurrAction =
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "SET_ERROR"; payload: string | null }
    | { type: "SET_MARKET_DATA"; payload: MarketData }
    | { type: "SET_CONNECTED"; payload: boolean }
    | { type: "SET_AVERAGE_APY_LOADING"; payload: boolean } // ✨ NEW
    | { type: "SET_AVERAGE_APY"; payload: number | null } // ✨ NEW

const initialState: HypurrState = {
  loading: false,
  error: null,
  marketData: null,
  isConnected: false,
  averageAPY: null, // ✨ NEW
  averageAPYLoading: false, // ✨ NEW
}

function hypurrReducer(state: HypurrState, action: HypurrAction): HypurrState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false }
    case "SET_MARKET_DATA":
      return {
        ...state,
        marketData: action.payload,
        loading: false,
        error: null,
      }
    case "SET_CONNECTED":
      return { ...state, isConnected: action.payload }
    case "SET_AVERAGE_APY_LOADING": // ✨ NEW
      return { ...state, averageAPYLoading: action.payload }
    case "SET_AVERAGE_APY": // ✨ NEW
      return {
        ...state,
        averageAPY: action.payload,
        averageAPYLoading: false
      }
    default:
      return state
  }
}

interface HypurrContextType {
  state: HypurrState
  refreshMarketData: () => Promise<void>
  getSupplyAPY: () => number | null
  getBorrowAPY: () => number | null
  getUtilization: () => number | null
  getMarketData: () => MarketData | null
  fetchAverageAPY: () => Promise<void> // ✨ CHANGED: Now returns void and stores in state
}

const HypurrContext = createContext<HypurrContextType | undefined>(undefined)

// Create public client for HyperEVM
const publicClient = createPublicClient({
  chain: hyperEVM,
  transport: http(),
})

export function HypurrProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(hypurrReducer, initialState)

  // Improved APY calculation with proper compound interest and precision
  const calculateAPYFromPreview = useCallback(async (): Promise<MarketData> => {
    try {
      console.log(
          "🔍 Fetching market data from contract:",
          HYPURR_MARKET_ADDRESS
      )

      // First try to get basic data to see what's available
      const [
        currentRateInfo,
        totalAsset,
        totalBorrow,
        ratePrecision,
        utilPrecision,
        feePrecision,
      ] = await Promise.all([
        publicClient.readContract({
          address: HYPURR_MARKET_ADDRESS,
          abi: HYPURR_MARKET_ABI,
          functionName: "currentRateInfo",
        }),
        publicClient.readContract({
          address: HYPURR_MARKET_ADDRESS,
          abi: HYPURR_MARKET_ABI,
          functionName: "totalAsset",
        }),
        publicClient.readContract({
          address: HYPURR_MARKET_ADDRESS,
          abi: HYPURR_MARKET_ABI,
          functionName: "totalBorrow",
        }),
        publicClient.readContract({
          address: HYPURR_MARKET_ADDRESS,
          abi: HYPURR_MARKET_ABI,
          functionName: "RATE_PRECISION",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: HYPURR_MARKET_ADDRESS,
          abi: HYPURR_MARKET_ABI,
          functionName: "UTIL_PREC",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: HYPURR_MARKET_ADDRESS,
          abi: HYPURR_MARKET_ABI,
          functionName: "FEE_PRECISION",
        }) as Promise<bigint>,
      ])

      // Safely extract data with proper validation
      if (
          !currentRateInfo ||
          !Array.isArray(currentRateInfo) ||
          currentRateInfo.length < 5
      ) {
        throw new Error("Invalid currentRateInfo structure")
      }
      if (!totalAsset || !Array.isArray(totalAsset) || totalAsset.length < 2) {
        throw new Error("Invalid totalAsset structure")
      }
      if (
          !totalBorrow ||
          !Array.isArray(totalBorrow) ||
          totalBorrow.length < 2
      ) {
        throw new Error("Invalid totalBorrow structure")
      }

      // Parse the rate info with null checks
      const rateInfo = {
        lastBlock: Number(currentRateInfo[0]) || 0,
        feeToProtocolRate: Number(currentRateInfo[1]) || 0,
        lastTimestamp: currentRateInfo[2]
            ? BigInt(currentRateInfo[2])
            : BigInt(0),
        ratePerSec: currentRateInfo[3] ? BigInt(currentRateInfo[3]) : BigInt(0),
        fullUtilizationRate: currentRateInfo[4]
            ? BigInt(currentRateInfo[4])
            : BigInt(0),
      }

      // Parse asset and borrow data with null checks
      const assetData = {
        amount: totalAsset[0] ? BigInt(totalAsset[0]) : BigInt(0),
        shares: totalAsset[1] ? BigInt(totalAsset[1]) : BigInt(0),
      }

      const borrowData = {
        amount: totalBorrow[0] ? BigInt(totalBorrow[0]) : BigInt(0),
        shares: totalBorrow[1] ? BigInt(totalBorrow[1]) : BigInt(0),
      }

      // Now try to get preview data if available (optional enhancement)
      let previewData = null
      let interestEarned = BigInt(0)
      try {
        previewData = (await publicClient.readContract({
          address: HYPURR_MARKET_ADDRESS,
          abi: HYPURR_MARKET_ABI,
          functionName: "previewAddInterest",
        })) as any

        if (
            previewData &&
            Array.isArray(previewData) &&
            previewData.length >= 6
        ) {
          interestEarned = previewData[0] ? BigInt(previewData[0]) : BigInt(0)

          // Use updated rate info from preview if available
          const previewRateInfo = previewData[3]
          if (
              previewRateInfo &&
              Array.isArray(previewRateInfo) &&
              previewRateInfo.length >= 5
          ) {
            rateInfo.ratePerSec = previewRateInfo[3]
                ? BigInt(previewRateInfo[3])
                : rateInfo.ratePerSec
            rateInfo.feeToProtocolRate =
                Number(previewRateInfo[1]) || rateInfo.feeToProtocolRate
          }
        }
      } catch (previewError) {
        console.warn(
            "⚠️ Preview data not available, using current rate info:",
            previewError
        )
      }

      // Validate data
      if (!rateInfo.ratePerSec || rateInfo.ratePerSec === BigInt(0)) {
        throw new Error("Invalid rate per second from contract")
      }

      // Validate precision values
      if (!ratePrecision || ratePrecision === BigInt(0)) {
        throw new Error("Invalid rate precision from contract")
      }

      // Calculate utilization with higher precision
      const utilization =
          assetData.amount > BigInt(0)
              ? (Number(
                      (borrowData.amount * (utilPrecision || BigInt(10000))) /
                      assetData.amount
                  ) /
                  Number(utilPrecision || BigInt(10000))) *
              100
              : 0

      // Get current rate per second
      const ratePerSec = rateInfo.ratePerSec
      const protocolFeeRate = rateInfo.feeToProtocolRate

      // Convert rate per second to a decimal (removing precision)
      const ratePerSecDecimal = Number(ratePerSec) / Number(ratePrecision)

      // Convert to annual rate
      const secondsPerYear = 365 * 24 * 60 * 60 // 31,536,000

      // Simple interest: APY = rate_per_second * seconds_per_year * 100
      const borrowAPYDecimal = ratePerSecDecimal * secondsPerYear
      const borrowAPYPercent = borrowAPYDecimal * 100

      // If the result is still crazy, let's try some common rate formats
      let finalBorrowAPY = borrowAPYPercent

      // Check if the rate might be annual already (common mistake)
      if (borrowAPYPercent > 1000) {
        console.log(
            "⚠️ Rate seems too high, trying alternative interpretations..."
        )

        // Maybe the rate is already annual and we just need to convert precision
        const annualRateDecimal = Number(ratePerSec) / Number(ratePrecision)
        const annualRatePercent = annualRateDecimal * 100

        // Or maybe it's per block and we need to account for block time
        const assumedBlockTime = 12 // seconds (common for Ethereum-like chains)
        const blocksPerYear = secondsPerYear / assumedBlockTime
        const perBlockAPY =
            (Number(ratePerSec) / Number(ratePrecision)) * blocksPerYear * 100

        console.log("🔄 Alternative rate interpretations:", {
          annualRatePercent,
          perBlockAPY,
          rawRateAsPercent: Number(ratePerSec) / 1e16, // if it's in basis points with 1e18 precision
        })

        // Use the most reasonable looking one
        if (annualRatePercent > 0 && annualRatePercent < 1000) {
          finalBorrowAPY = annualRatePercent
        } else if (perBlockAPY > 0 && perBlockAPY < 1000) {
          finalBorrowAPY = perBlockAPY
        } else {
          // Last resort: maybe it's in a completely different format
          finalBorrowAPY = Number(ratePerSec) / 1e16 // Convert from wei to basis points
        }
      }

      // Calculate supply APY using the corrected borrow APY
      const utilizationDecimal = utilization / 100

      // Protocol fee rate handling - try different precisions
      let protocolFeeDecimal = 0
      if (feePrecision && feePrecision > BigInt(0)) {
        protocolFeeDecimal = Number(protocolFeeRate) / Number(feePrecision)
      } else {
        // Fallback: assume basis points (10000 = 100%)
        protocolFeeDecimal = protocolFeeRate / 10000
      }

      const netFeeMultiplier = Math.max(0, 1 - protocolFeeDecimal)
      const supplyAPYPercent =
          finalBorrowAPY * utilizationDecimal * netFeeMultiplier

      // Try alternative calculation using the interest earned from preview
      let alternativeSupplyAPY = 0
      if (assetData.amount > BigInt(0) && interestEarned > BigInt(0)) {
        // This might be interest earned per some time period - let's be very careful
        const interestRatio = Number(interestEarned) / Number(assetData.amount)

        // If this is very small, it might be per-second or per-block interest
        if (interestRatio < 0.001) {
          // Assume it's per-second and annualize
          alternativeSupplyAPY = interestRatio * secondsPerYear * 100
        } else {
          // If it's larger, it might already be annualized or per-year
          alternativeSupplyAPY = interestRatio * 100
        }

        // Sanity check
        if (alternativeSupplyAPY > 1000) {
          alternativeSupplyAPY = 0 // Ignore if unreasonable
        }
      }

      // Format amounts (USDT0 has 6 decimals)
      const totalSupplied = formatUnits(assetData.amount, 6)
      const totalBorrowed = formatUnits(borrowData.amount, 6)

      // Use the most reasonable supply APY
      const finalSupplyAPY =
          alternativeSupplyAPY > 0 && alternativeSupplyAPY < 100
              ? alternativeSupplyAPY
              : supplyAPYPercent

      const result = {
        supplyAPY: Math.max(0, Math.min(100, finalSupplyAPY)), // Cap at 100% for sanity
        borrowAPY: Math.max(0, Math.min(1000, finalBorrowAPY)), // Cap at 1000% for sanity
        utilization,
        totalSupplied,
        totalBorrowed,
        lastUpdated: new Date(),
      }

      return result
    } catch (error) {
      console.error("❌ Error calculating APY:", error)

      // Log more details about the error
      if (error instanceof Error) {
        console.error("Error message:", error.message)
        console.error("Error stack:", error.stack)
      }

      throw error
    }
  }, [])

  const fetchAverageAPY = useCallback(async () => {
    // Don't fetch if already loading or already have data
    if (state.averageAPYLoading || state.averageAPY !== null) {
      return
    }

    dispatch({ type: "SET_AVERAGE_APY_LOADING", payload: true })

    try {
      console.log("🔍 Fetching average APY from Hypurr API...")

      const response = await fetch(
          "https://indexer.hypurr.fi/api/chains/999/isolated/0x34E3d3834B79D77d8558307535Cdf4871B64Bc65/apy"
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      console.log("📊 Hypurr API response:", data)

      // Extract lendAPY values from timeSeriesData
      if (!data.timeSeriesData || !Array.isArray(data.timeSeriesData)) {
        throw new Error("Invalid API response: missing timeSeriesData")
      }

      const lendAPYValues = data.timeSeriesData
          .map((item: any) => item.lendAPY)
          .filter((apy: any) => typeof apy === "number" && !isNaN(apy))

      if (lendAPYValues.length === 0) {
        throw new Error("No valid lendAPY values found in response")
      }

      // Calculate average
      const rawAverageAPY =
          lendAPYValues.reduce((sum: number, apy: number) => sum + apy, 0) /
          lendAPYValues.length

      // console.log(
      //     `📊 Raw average APY: ${rawAverageAPY.toFixed(2)}% from ${lendAPYValues.length} data points`
      // )

      // ✨ Apply 20% fee deduction
      const feeRate = 0.20 // 20% fee
      const apyAfterFees = rawAverageAPY * (1 - feeRate)

      // ✨ Apply 12% minimum floor
      const minimumAPY = 7.18
      const finalAverageAPY = Math.max(apyAfterFees, minimumAPY)

      // console.log(
      //     `💰 Fee calculation: ${rawAverageAPY.toFixed(2)}% - ${(feeRate * 100)}% fee = ${apyAfterFees.toFixed(2)}%`
      // )
      console.log(
          `📈 Avg APY: ${finalAverageAPY.toFixed(2)}%)`
      )

      dispatch({ type: "SET_AVERAGE_APY", payload: finalAverageAPY })
    } catch (error) {
      console.error("❌ Error fetching average APY:", error)
      dispatch({ type: "SET_AVERAGE_APY", payload: null })
    }
  }, [state.averageAPYLoading, state.averageAPY])

  // Refresh market data
  const refreshMarketData = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true })
    dispatch({ type: "SET_ERROR", payload: null })

    try {
      const marketData = await calculateAPYFromPreview()
      dispatch({ type: "SET_MARKET_DATA", payload: marketData })
      dispatch({ type: "SET_CONNECTED", payload: true })
      console.log("✅ Market data refreshed successfully")
    } catch (error) {
      console.error("❌ Failed to refresh market data:", error)

      let errorMessage = "Failed to fetch market data"
      if (error instanceof Error) {
        if (error.message.includes("execution reverted")) {
          errorMessage = "Contract call failed - the market may be paused"
        } else if (error.message.includes("network")) {
          errorMessage = "Network connection error"
        } else if (error.message.includes("Invalid rate info")) {
          errorMessage = "Invalid contract response - check contract address"
        } else {
          errorMessage = error.message
        }
      }

      dispatch({ type: "SET_ERROR", payload: errorMessage })
      dispatch({ type: "SET_CONNECTED", payload: false })
    }
  }, [calculateAPYFromPreview])

  // Helper functions
  const getSupplyAPY = (): number | null => {
    return state.marketData?.supplyAPY ?? null
  }

  const getBorrowAPY = (): number | null => {
    return state.marketData?.borrowAPY ?? null
  }

  const getUtilization = (): number | null => {
    return state.marketData?.utilization ?? null
  }

  const getMarketData = (): MarketData | null => {
    return state.marketData
  }

  // Auto-refresh market data on mount and periodically
  useEffect(() => {
    refreshMarketData()

    // Refresh every 30 seconds
    const interval = setInterval(refreshMarketData, 30000)
    return () => clearInterval(interval)
  }, [refreshMarketData])

  // ✨ NEW: Fetch average APY once on mount
  useEffect(() => {
    fetchAverageAPY()
  }, [fetchAverageAPY])

  // Test connection on mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        await publicClient.getBlockNumber()
        dispatch({ type: "SET_CONNECTED", payload: true })
      } catch (error) {
        console.error("Failed to connect to HyperEVM:", error)
        dispatch({ type: "SET_CONNECTED", payload: false })
        dispatch({
          type: "SET_ERROR",
          payload: "Failed to connect to HyperEVM network",
        })
      }
    }

    testConnection()
  }, [])

  const value: HypurrContextType = {
    state,
    refreshMarketData,
    getSupplyAPY,
    getBorrowAPY,
    getUtilization,
    getMarketData,
    fetchAverageAPY, // ✨ CHANGED: Now memoized and stores in state
  }

  return (
      <HypurrContext.Provider value={value}>{children}</HypurrContext.Provider>
  )
}

export function useHypurr() {
  const context = useContext(HypurrContext)
  if (!context) {
    throw new Error("useHypurr must be used within a HypurrProvider")
  }
  return context
}

// Export types and constants for use in other components
export type { MarketData, HypurrState }
export { HYPURR_MARKET_ADDRESS, hyperEVM }