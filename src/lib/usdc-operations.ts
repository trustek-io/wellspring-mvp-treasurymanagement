// src/lib/usdc-operations.ts
import { encodeFunctionData, formatUnits, parseUnits, type PublicClient } from "viem"
import { USDC_ABI, CONTRACT_ADDRESSES, USDC_AMOUNTS } from "@/lib/zerodev-constants"

export interface USDCBalance {
    raw: bigint
    formatted: string
    decimals: number
}

export interface USDCTransferParams {
    to: `0x${string}`
    amount: bigint // Raw amount (with 6 decimals)
}

export interface USDCApprovalParams {
    spender: `0x${string}`
    amount: bigint // Raw amount (with 6 decimals)
}

/**
 * Get USDC balance for an address
 */
export async function getUSDCBalance(
    publicClient: PublicClient,
    address: `0x${string}`
): Promise<USDCBalance> {
    console.log("💰 Getting USDC balance for:", address)

    try {
        const balance = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.USDC_ARBITRUM,
            abi: USDC_ABI,
            functionName: "balanceOf",
            args: [address],
        }) as bigint

        const decimals = Number(USDC_AMOUNTS.DECIMALS)
        const formatted = formatUnits(balance, decimals)

        console.log("💰 USDC Balance:", {
            raw: balance.toString(),
            formatted: `${formatted} USDC`,
            decimals,
        })

        return {
            raw: balance,
            formatted,
            decimals,
        }
    } catch (error) {
        console.error("❌ Error getting USDC balance:", error)
        throw error
    }
}

/**
 * Create USDC transfer call data
 */
export function createUSDCTransferCallData({ to, amount }: USDCTransferParams) {
    console.log("📤 Creating USDC transfer call data:", {
        to,
        amount: amount.toString(),
        formatted: formatUnits(amount, Number(USDC_AMOUNTS.DECIMALS)),
    })

    return {
        to: CONTRACT_ADDRESSES.USDC_ARBITRUM,
        value: 0n, // ERC20 transfers don't send ETH
        data: encodeFunctionData({
            abi: USDC_ABI,
            functionName: "transfer",
            args: [to, amount],
        }),
    }
}

/**
 * Create USDC approval call data
 */
export function createUSDCApprovalCallData({ spender, amount }: USDCApprovalParams) {
    console.log("✅ Creating USDC approval call data:", {
        spender,
        amount: amount.toString(),
        formatted: formatUnits(amount, Number(USDC_AMOUNTS.DECIMALS)),
    })

    return {
        to: CONTRACT_ADDRESSES.USDC_ARBITRUM,
        value: 0n, // ERC20 approvals don't send ETH
        data: encodeFunctionData({
            abi: USDC_ABI,
            functionName: "approve",
            args: [spender, amount],
        }),
    }
}

/**
 * Send sponsored USDC transfer
 */
export async function sendSponsoredUSDCTransfer(
    kernelClient: any,
    params: USDCTransferParams
): Promise<string> {
    console.log("💸 Sending sponsored USDC transfer...")

    try {
        const callData = createUSDCTransferCallData(params)

        const userOpHash = await kernelClient.sendUserOperation({
            callData: await kernelClient.account.encodeCallData(callData),
        })

        console.log("✅ USDC transfer sent:", userOpHash)

        // Wait for transaction to be mined
        const bundlerClient = kernelClient.bundlerTransport
        const receipt = await bundlerClient.waitForUserOperationReceipt({
            hash: userOpHash,
        })

        console.log("✅ USDC transfer mined:", receipt.transactionHash)
        return receipt.transactionHash
    } catch (error) {
        console.error("❌ Sponsored USDC transfer failed:", error)
        throw error
    }
}

/**
 * Send sponsored USDC approval
 */
export async function sendSponsoredUSDCApproval(
    kernelClient: any,
    params: USDCApprovalParams
): Promise<string> {
    console.log("✅ Sending sponsored USDC approval...")

    try {
        const callData = createUSDCApprovalCallData(params)

        const userOpHash = await kernelClient.sendUserOperation({
            callData: await kernelClient.account.encodeCallData(callData),
        })

        console.log("✅ USDC approval sent:", userOpHash)

        // Wait for transaction to be mined
        const bundlerClient = kernelClient.bundlerTransport
        const receipt = await bundlerClient.waitForUserOperationReceipt({
            hash: userOpHash,
        })

        console.log("✅ USDC approval mined:", receipt.transactionHash)
        return receipt.transactionHash
    } catch (error) {
        console.error("❌ Sponsored USDC approval failed:", error)
        throw error
    }
}

/**
 * Helper: Convert USDC amount from string to raw bigint
 */
export function parseUSDCAmount(amount: string): bigint {
    return parseUnits(amount, Number(USDC_AMOUNTS.DECIMALS))
}

/**
 * Helper: Convert raw USDC amount to formatted string
 */
export function formatUSDCAmount(amount: bigint): string {
    return formatUnits(amount, Number(USDC_AMOUNTS.DECIMALS))
}

/**
 * Helper: Get common USDC test amounts
 */
export const USDC_TEST_AMOUNTS = {
    ONE_CENT: parseUSDCAmount("0.01"), // $0.01
    ONE_DOLLAR: parseUSDCAmount("1"), // $1.00
    TEN_DOLLARS: parseUSDCAmount("10"), // $10.00
    HUNDRED_DOLLARS: parseUSDCAmount("100"), // $100.00
} as const