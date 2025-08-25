// src/lib/backend-session-manager.ts
"use server"

import {
    createSessionKeyClientForChain,
    getTokenBalance,
} from '@/lib/unified-session-key-system'
import { getSessionKeys} from '@/actions/api'

// Import the class directly, NOT the singleton factory
import { SimplifiedCrossChainManager } from '@/lib/simplified-cross-chain-manager'

interface BackendSessionState {
    manager: SimplifiedCrossChainManager
    initialized: boolean
    subOrgId: string
    smartAccountAddress: string
}

function getByNetwork(network: string, allKeys: any[]): any | undefined {
    return allKeys.find(sk => sk.network === network)
}


/**
 * Initialize backend session manager with stored session keys
 * Creates completely fresh instances to avoid cross-request contamination
 * IMPORTANT: We create a NEW instance, not use the singleton getCrossChainManager()
 */
export async function initializeBackendSession(
    subOrgId: string,
    smartAccountAddress: string
): Promise<BackendSessionState | null> {
    try {
        console.log("🔧 Initializing FRESH backend session manager for user:", subOrgId, "smartAccount:", smartAccountAddress)

        // Get stored session key from database
        const storedSessionKeys = await getSessionKeys(subOrgId)

        if (!storedSessionKeys) {
            console.log("❌ No session key found for user:", subOrgId)
            return null
        }

        // Verify the session key is for the correct smart account
        if (storedSessionKeys[0].smart_account_address.toLowerCase() !== smartAccountAddress.toLowerCase()) {
            console.log("❌ Session key mismatch for smart account. Expected:", smartAccountAddress, "Got:", storedSessionKeys[0].smart_account_address)
            return null
        }

        // ⚠️  CRITICAL: Create a NEW instance, NOT the singleton!
        // This ensures complete isolation between requests
        const manager = new SimplifiedCrossChainManager()

        // Clear any existing state (defensive programming)
        manager.sessionKeyData = null
        manager.clients = {}

        console.log("🆕 Created fresh SimplifiedCrossChainManager instance for user:", subOrgId)

        const arbKey = getByNetwork('arbitrum', storedSessionKeys)
        const hyperKey = getByNetwork('hyperevm', storedSessionKeys)
        // Reconstruct session key data with current user's info
        manager.sessionKeyData = {
            address: storedSessionKeys[0].session_key_address as `0x${string}`,
            privateKey: storedSessionKeys[0].session_key_private_key as `0x${string}`,
            chains: {
                arbitrum: {
                    smartAccountAddress: smartAccountAddress as any,
                    serializedSessionKey: arbKey.serialized_session_key,
                    isApproved: true,
                    address: arbKey.session_key_address as `0x${string}`,
                    privateKey: arbKey.session_key_private_key as `0x${string}`,
                },
                hyperevm: {
                    smartAccountAddress: smartAccountAddress as any,
                    serializedSessionKey: hyperKey.serialized_session_key,
                    isApproved: true,
                    address: hyperKey.session_key_address as `0x${string}`,
                    privateKey: hyperKey.session_key_private_key as `0x${string}`,
                }
            }
        }

        console.log("📝 Set session key data for user:", subOrgId, "with session key address:", manager.sessionKeyData.address)

        // Create clients for both chains with current user's session key
        const arbSessionKeyPair = {
            address: arbKey.session_key_address as `0x${string}`,
            privateKey: arbKey.session_key_private_key as `0x${string}`
        }

        const hyperSessionKeyPair = {
            address: hyperKey.session_key_address as `0x${string}`,
            privateKey: hyperKey.session_key_private_key as `0x${string}`
        }

        console.log("🔗 Creating Arbitrum client for user:", subOrgId)
        // Create Arbitrum client
        manager.clients.arbitrum = await createSessionKeyClientForChain(
            arbSessionKeyPair,
            'arbitrum',
            arbKey.serialized_session_key
        )

        console.log("🔗 Creating HyperEVM client for user:", subOrgId)
        // Create HyperEVM client
        manager.clients.hyperevm = await createSessionKeyClientForChain(
            hyperSessionKeyPair,
            'hyperevm',
            hyperKey.serialized_session_key
        )

        const arbitrumSmartAccount = manager.clients.arbitrum?.kernelClient?.account?.address
        const hyperevmSmartAccount = manager.clients.hyperevm?.kernelClient?.account?.address

        console.log("✅ Backend session manager initialized successfully for user:", subOrgId)
        console.log("🎯 Arbitrum smart account in session:", arbitrumSmartAccount)
        console.log("🎯 HyperEVM smart account in session:", hyperevmSmartAccount)
        console.log("🎯 Expected smart account:", smartAccountAddress)

        // Verify smart account addresses match
        if (arbitrumSmartAccount?.toLowerCase() !== smartAccountAddress.toLowerCase()) {
            console.error("⚠️  Arbitrum smart account mismatch!")
            console.error("Expected:", smartAccountAddress)
            console.error("Got:", arbitrumSmartAccount)
        }

        return {
            manager,
            initialized: true,
            subOrgId,
            smartAccountAddress
        }

    } catch (error) {
        console.error("❌ Failed to initialize backend session manager for user:", subOrgId, error)
        return null
    }
}

/**
 * Check if session state is ready for operations
 */
export async function isBackendSessionReady(sessionState: BackendSessionState | null): Promise<boolean> {
    if (!sessionState) return false
    return sessionState.initialized && sessionState.manager.isReady(['arbitrum', 'hyperevm'])
}

/**
 * Execute automated bridge and supply operation
 */
export async function executeBackendBridgeAndSupply(
    sessionState: BackendSessionState,
    usdcAmount: string
): Promise<{
    success: boolean
    bridgeTxHash?: string
    supplyTxHash?: string
    approvalTxHash?: string
    error?: string
}> {
    if (!await isBackendSessionReady(sessionState)) {
        return {
            success: false,
            error: "Backend session manager not ready"
        }
    }

    try {
        console.log("🤖 Executing automated bridge and supply for user:", sessionState.subOrgId, "amount:", usdcAmount, "USDC")

        const result = await sessionState.manager.bridgeAndSupply(usdcAmount)

        console.log("✅ Bridge and supply completed for user:", sessionState.subOrgId, "result:", result)

        return {
            success: true,
            bridgeTxHash: result.bridgeTxHash,
            supplyTxHash: result.supplyTxHash,
            approvalTxHash: result.approvalTxHash
        }

    } catch (error) {
        console.error("❌ Automated bridge and supply failed for user:", sessionState.subOrgId, error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        }
    }
}

/**
 * Get balances across chains
 */
export async function getBackendBalances(sessionState: BackendSessionState): Promise<Record<string, any>> {
    if (!await isBackendSessionReady(sessionState)) {
        throw new Error("Backend session manager not ready")
    }

    console.log("💰 Getting balances for user:", sessionState.subOrgId)
    return await sessionState.manager.getBalances()
}

/**
 * Check if user has sufficient USDC for operation
 */
export async function checkBackendUSDCBalance(
    sessionState: BackendSessionState,
    minimumAmount: string
): Promise<{
    hasEnough: boolean
    currentBalance: string
    smartAccountAddress: string
}> {
    if (!await isBackendSessionReady(sessionState)) {
        throw new Error("Backend session manager not ready")
    }

    console.log("💰 Checking USDC balance for user:", sessionState.subOrgId, "smartAccount:", sessionState.smartAccountAddress)

    const arbitrumClient = sessionState.manager.clients.arbitrum
    const smartAccountAddress = arbitrumClient.kernelClient.account.address

    console.log("🔍 Arbitrum client smart account address:", smartAccountAddress)
    console.log("🔍 Expected smart account address:", sessionState.smartAccountAddress)

    if (smartAccountAddress.toLowerCase() !== sessionState.smartAccountAddress.toLowerCase()) {
        console.error("⚠️  Smart account address mismatch!")
        console.error("Expected:", sessionState.smartAccountAddress)
        console.error("Got from client:", smartAccountAddress)
    }

    const balance = await getTokenBalance(arbitrumClient, 'USDC', smartAccountAddress)
    const hasEnough = parseFloat(balance.formatted) >= parseFloat(minimumAmount)

    console.log("💵 USDC Balance check result:", {
        userSubOrgId: sessionState.subOrgId,
        smartAccountAddress,
        currentBalance: balance.formatted,
        minimumAmount,
        hasEnough
    })

    return {
        hasEnough,
        currentBalance: balance.formatted,
        smartAccountAddress
    }
}

/**
 * Execute automated Hypurr deposit operation (HyperEVM only)
 */
export async function executeBackendHypurrDeposit(
    sessionState: BackendSessionState,
    usdtAmount: string,
    receiver?: string
): Promise<{
    success: boolean
    approvalTxHash?: string
    depositTxHash?: string
    error?: string
}> {
    if (!await isBackendSessionReady(sessionState)) {
        return {
            success: false,
            error: "Backend session manager not ready"
        }
    }

    try {
        console.log("🏦 Executing automated Hypurr deposit for user:", sessionState.subOrgId, "amount:", usdtAmount, "USDT0")

        const result = await sessionState.manager.executeHypurrDeposit(usdtAmount)

        console.log("✅ Hypurr deposit completed for user:", sessionState.subOrgId, "result:", result)

        return {
            success: true,
            approvalTxHash: result.approvalTxHash,
            depositTxHash: result.depositTxHash
        }

    } catch (error) {
        console.error("❌ Automated Hypurr deposit failed for user:", sessionState.subOrgId, error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        }
    }
}

/**
 * Execute automated USDT to USDT0 OFT bridge operation (Arbitrum only)
 */
export async function executeBackendUSDTToUSDT0Bridge(
    sessionState: BackendSessionState
): Promise<{
    success: boolean
    bridgeTxHash?: string
    depositTxHash?: string
    approvalTxHash?: string
    error?: string
}> {
    if (!await isBackendSessionReady(sessionState)) {
        return {
            success: false,
            error: "Backend session manager not ready"
        }
    }

    try {
        console.log("🌉 Executing automated USDT to USDT0 OFT bridge for user:", sessionState.subOrgId)

        // Step 1: Check initial USDT0 balance on HyperEVM
        const hyperevmClient = sessionState.manager.clients.hyperevm
        const smartAccountAddress = hyperevmClient.kernelClient.account.address

        const initialBalance = await getTokenBalance(hyperevmClient, 'USDT0', smartAccountAddress)
        console.log("💰 Initial USDT0 balance on HyperEVM:", initialBalance.formatted)
        const currentBalance = await getTokenBalance(hyperevmClient, 'USDT0', smartAccountAddress)

        // Step 2: Execute the bridge
        const bridgeTxHash = await sessionState.manager.executeUSDTToUSDT0ViaOFT()
        console.log("✅ USDT to USDT0 bridge transaction completed for user:", sessionState.subOrgId, "TX:", bridgeTxHash)

        // Step 3: Wait for USDT0 to arrive on HyperEVM with retries
        console.log("⏳ Waiting for USDT0 to arrive on HyperEVM...")

        const maxRetries = 60 // 60 attempts
        const delayMs = 5000   // 5 seconds between attempts
        let retries = 0
        let newUSDT0Amount = "0"

        while (retries < maxRetries) {
            try {
                const balanceIncrease = parseFloat(currentBalance.formatted) - parseFloat(initialBalance.formatted)

                console.log(`📊 Attempt ${retries + 1}/${maxRetries}: USDT0 balance ${currentBalance.formatted} (increase: +${balanceIncrease.toFixed(6)})`)

                if (balanceIncrease > 0.001) { // At least 0.001 USDT0 increase
                    newUSDT0Amount = balanceIncrease.toString()
                    console.log(`✅ USDT0 received on HyperEVM: +${newUSDT0Amount} USDT0`)
                    break
                }

                if (retries < maxRetries - 1) {
                    console.log(`⏳ No USDT0 increase yet, waiting ${delayMs/1000}s before retry...`)
                    await new Promise(resolve => setTimeout(resolve, delayMs))
                }

                retries++

            } catch (balanceError) {
                console.error(`❌ Error checking USDT0 balance on attempt ${retries + 1}:`, balanceError)
                retries++
                if (retries < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delayMs))
                }
            }
        }

        if (parseFloat(newUSDT0Amount) <= 0.001) {
            console.warn("⚠️ USDT0 did not arrive on HyperEVM within expected time, but bridge transaction completed")
            return {
                success: true,
                bridgeTxHash,
                error: "Bridge completed but USDT0 not detected on HyperEVM yet - may arrive later"
            }
        }

        // Step 4: Execute Hypurr deposit with the received USDT0
        console.log("🏦 Executing Hypurr deposit with received USDT0:", newUSDT0Amount)

        try {
            const hypurrResult = await sessionState.manager.executeHypurrDeposit(newUSDT0Amount)

            console.log("✅ Complete bridge + deposit flow completed for user:", sessionState.subOrgId, {
                bridgeTxHash,
                approvalTxHash: hypurrResult.approvalTxHash,
                depositTxHash: hypurrResult.depositTxHash
            })

            return {
                success: true,
                bridgeTxHash,
                depositTxHash: hypurrResult.depositTxHash,
                approvalTxHash: hypurrResult.approvalTxHash
            }

        } catch (depositError) {
            console.error("❌ Hypurr deposit failed after successful bridge:", depositError)
            return {
                success: true, // Bridge was successful
                bridgeTxHash,
                error: `Bridge successful but Hypurr deposit failed: ${depositError instanceof Error ? depositError.message : 'Unknown error'}`
            }
        }

    } catch (error) {
        console.error("❌ Automated USDT to USDT0 bridge failed for user:", sessionState.subOrgId, error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        }
    }
}

/**
 * Check if user has sufficient USDT for OFT bridge operation
 */
export async function checkBackendUSDTBalance(
    sessionState: BackendSessionState,
    minimumAmount: string
): Promise<{
    hasEnough: boolean
    currentBalance: string
    smartAccountAddress: string
}> {
    if (!await isBackendSessionReady(sessionState)) {
        throw new Error("Backend session manager not ready")
    }

    console.log("💰 Checking USDT balance for user:", sessionState.subOrgId, "smartAccount:", sessionState.smartAccountAddress)

    const arbitrumClient = sessionState.manager.clients.arbitrum
    const smartAccountAddress = arbitrumClient.kernelClient.account.address

    console.log("🔍 Arbitrum client smart account address:", smartAccountAddress)
    console.log("🔍 Expected smart account address:", sessionState.smartAccountAddress)

    if (smartAccountAddress.toLowerCase() !== sessionState.smartAccountAddress.toLowerCase()) {
        console.error("⚠️  Smart account address mismatch!")
        console.error("Expected:", sessionState.smartAccountAddress)
        console.error("Got from client:", smartAccountAddress)
    }

    const balance = await getTokenBalance(arbitrumClient, 'USDT', smartAccountAddress)
    const hasEnough = parseFloat(balance.formatted) >= parseFloat(minimumAmount)

    console.log("💵 USDT Balance check result:", {
        userSubOrgId: sessionState.subOrgId,
        smartAccountAddress,
        currentBalance: balance.formatted,
        minimumAmount,
        hasEnough
    })

    return {
        hasEnough,
        currentBalance: balance.formatted,
        smartAccountAddress
    }
}

/**
 * Check if user has sufficient USDT0 for Hypurr deposit operation
 */
export async function checkBackendUSDT0Balance(
    sessionState: BackendSessionState,
    minimumAmount: string
): Promise<{
    hasEnough: boolean
    currentBalance: string
    smartAccountAddress: string
}> {
    if (!await isBackendSessionReady(sessionState)) {
        throw new Error("Backend session manager not ready")
    }

    console.log("💰 Checking USDT0 balance for user:", sessionState.subOrgId, "smartAccount:", sessionState.smartAccountAddress)

    const hyperevmClient = sessionState.manager.clients.hyperevm
    const smartAccountAddress = hyperevmClient.kernelClient.account.address

    console.log("🔍 HyperEVM client smart account address:", smartAccountAddress)
    console.log("🔍 Expected smart account address:", sessionState.smartAccountAddress)

    if (smartAccountAddress.toLowerCase() !== sessionState.smartAccountAddress.toLowerCase()) {
        console.error("⚠️  Smart account address mismatch!")
        console.error("Expected:", sessionState.smartAccountAddress)
        console.error("Got from client:", smartAccountAddress)
    }

    const balance = await getTokenBalance(hyperevmClient, 'USDT0', smartAccountAddress)
    const hasEnough = parseFloat(balance.formatted) >= parseFloat(minimumAmount)

    console.log("💵 USDT0 Balance check result:", {
        userSubOrgId: sessionState.subOrgId,
        smartAccountAddress,
        currentBalance: balance.formatted,
        minimumAmount,
        hasEnough
    })

    return {
        hasEnough,
        currentBalance: balance.formatted,
        smartAccountAddress
    }
}