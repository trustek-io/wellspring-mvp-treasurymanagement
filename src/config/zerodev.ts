// src/config/zerodev.ts
import { arbitrum } from "viem/chains"
import { env } from "@/env.mjs"

const {
    NEXT_PUBLIC_ZERODEV_PROJECT_ID,
    NEXT_PUBLIC_ZERODEV_ARBITRUM_RPC,
    NEXT_PUBLIC_USDC_ARBITRUM_ADDRESS,
} = env

export const zeroDevConfig = {
    // Project Configuration
    projectId: NEXT_PUBLIC_ZERODEV_PROJECT_ID,

    // Network Configuration
    chain: arbitrum,
    chainId: arbitrum.id, // 42161

    // RPC Configuration
    rpcUrl: NEXT_PUBLIC_ZERODEV_ARBITRUM_RPC,
    ultraRelayRpcUrl: `${NEXT_PUBLIC_ZERODEV_ARBITRUM_RPC}?provider=ULTRA_RELAY`,

    // Contract Addresses
    contracts: {
        usdc: NEXT_PUBLIC_USDC_ARBITRUM_ADDRESS as `0x${string}`,
    },

    // Entry Point Configuration (ZeroDev uses "0.7" string)
    entryPointVersion: "0.7" as const,

    // Gas Sponsorship Configuration
    gasPolicy: {
        // These will be configured in ZeroDev dashboard
        sponsorshipEnabled: true,
        fallbackToUserFunds: true, // If sponsorship fails, use user's funds
    },

    // Session Key Configuration
    sessionKey: {
        // Default expiry: 24 hours from creation
        defaultValidityDuration: 24 * 60 * 60, // 24 hours in seconds

        // Default policies for USDC operations
        defaultUSDCPolicies: {
            // Allow USDC transfers up to $1000
            maxTransferAmount: "1000000000", // 1000 USDC (6 decimals)

            // Allow USDC approvals (for DeFi operations)
            allowApprovals: true,

            // Target contracts that can be interacted with
            allowedTargets: [
                NEXT_PUBLIC_USDC_ARBITRUM_ADDRESS, // USDC contract
                // We'll add more contracts (HypurrFi, etc.) in later phases
            ],
        },
    },
} as const

// Type exports for better TypeScript support
export type ZeroDevConfig = typeof zeroDevConfig
export type ChainId = typeof zeroDevConfig.chainId
export type ContractAddress = typeof zeroDevConfig.contracts.usdc