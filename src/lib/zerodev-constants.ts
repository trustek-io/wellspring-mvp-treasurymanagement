// src/lib/zerodev-constants.ts
import { zeroDevConfig } from "@/config/zerodev"

// USDC Contract ABI (minimal - for transfers and approvals)
export const USDC_ABI = [
    // Standard ERC20 functions
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
    {
        constant: false,
        inputs: [
            { name: "_to", type: "address" },
            { name: "_value", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ name: "", type: "bool" }],
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { name: "_spender", type: "address" },
            { name: "_value", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        type: "function",
    },
    {
        constant: true,
        inputs: [
            { name: "_owner", type: "address" },
            { name: "_spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
    },
] as const

// Contract Addresses (from config)
export const CONTRACT_ADDRESSES = {
    USDC_ARBITRUM: zeroDevConfig.contracts.usdc,
} as const

// Common amounts for USDC (6 decimals)
export const USDC_AMOUNTS = {
    // Test amounts
    TEST_AMOUNT: 1_000_000n, // 1 USDC
    SMALL_TEST_AMOUNT: 100_000n, // 0.1 USDC

    // Practical amounts
    MIN_DEPOSIT: 10_000_000n, // 10 USDC
    MAX_SESSION_KEY_LIMIT: 1000_000_000n, // 1000 USDC

    // Decimals
    DECIMALS: 6n,
} as const

// Session Key Defaults
export const SESSION_KEY_DEFAULTS = {
    // 24 hours from now
    VALIDITY_DURATION: zeroDevConfig.sessionKey.defaultValidityDuration,

    // Common permission patterns
    USDC_TRANSFER_ONLY: "usdc_transfer_only",
    USDC_FULL_ACCESS: "usdc_full_access",
    DEFI_OPERATIONS: "defi_operations",
} as const

// Gas Estimation Defaults (for UltraRelay)
export const GAS_DEFAULTS = {
    // UltraRelay uses zero gas estimation for efficiency
    MAX_FEE_PER_GAS: 0n,
    MAX_PRIORITY_FEE_PER_GAS: 0n,

    // Fallback gas limits if needed
    TRANSFER_GAS_LIMIT: 100_000n,
    APPROVE_GAS_LIMIT: 80_000n,
} as const

// ZeroDev Client Types
export type SessionKeyPermissionType = keyof typeof SESSION_KEY_DEFAULTS
export type USDCAmount = typeof USDC_AMOUNTS[keyof typeof USDC_AMOUNTS]