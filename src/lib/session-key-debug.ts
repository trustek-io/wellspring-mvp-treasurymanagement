// src/lib/session-key-debug.ts
"use server"

import {
    initializeBackendSession,
    checkBackendUSDCBalance,
    isBackendSessionReady
} from '@/lib/backend-session-manager'
import { getSessionKey } from '@/actions/api'

interface SessionKeyDiagnostic {
    subOrgId: string
    smartAccountAddress: string
    issues: string[]
    recommendations: string[]
    sessionKeyInfo?: {
        address: string
        smartAccountMatch: boolean
        hasArbitrumClient: boolean
        hasHyperEVMClient: boolean
        isReady: boolean
    }
}

/**
 * Debug session key issues and provide recommendations
 */
export async function debugSessionKey(
    subOrgId: string,
    smartAccountAddress: string
): Promise<SessionKeyDiagnostic> {
    const diagnostic: SessionKeyDiagnostic = {
        subOrgId,
        smartAccountAddress,
        issues: [],
        recommendations: []
    }

    try {
        console.log("🔍 Starting session key diagnostics for:", subOrgId)

        // Step 1: Check if session key exists in database
        const storedSessionKey = await getSessionKey(subOrgId)

        if (!storedSessionKey) {
            diagnostic.issues.push("No session key found in database")
            diagnostic.recommendations.push("User needs to complete session key setup on frontend first")
            return diagnostic
        }

        console.log("✅ Session key found in database:", storedSessionKey.session_key_address)

        // Step 2: Check smart account address match
        const smartAccountMatch = storedSessionKey.smart_account_address.toLowerCase() === smartAccountAddress.toLowerCase()

        if (!smartAccountMatch) {
            diagnostic.issues.push(`Smart account mismatch: Expected ${smartAccountAddress}, got ${storedSessionKey.smart_account_address}`)
            diagnostic.recommendations.push("User needs to regenerate session keys for correct smart account")
        }

        // Step 3: Try to initialize backend session
        const sessionState = await initializeBackendSession(subOrgId, smartAccountAddress)

        if (!sessionState) {
            diagnostic.issues.push("Failed to initialize backend session")
            diagnostic.recommendations.push("Session key may be corrupted or invalid - regenerate session keys")
            return diagnostic
        }

        console.log("✅ Backend session initialized successfully")

        // Step 4: Check if session is ready
        const isReady = await isBackendSessionReady(sessionState)

        diagnostic.sessionKeyInfo = {
            address: storedSessionKey.session_key_address,
            smartAccountMatch,
            hasArbitrumClient: !!sessionState.manager.clients.arbitrum,
            hasHyperEVMClient: !!sessionState.manager.clients.hyperevm,
            isReady
        }

        if (!isReady) {
            diagnostic.issues.push("Session key not ready for operations")
            diagnostic.recommendations.push("Check if session key clients are properly initialized")
        }

        // Step 5: Test basic operations
        try {
            const arbitrumClient = sessionState.manager.clients.arbitrum
            if (arbitrumClient) {
                const actualSmartAccount = arbitrumClient.kernelClient.account.address

                if (actualSmartAccount.toLowerCase() !== smartAccountAddress.toLowerCase()) {
                    diagnostic.issues.push(`Arbitrum client smart account mismatch: Expected ${smartAccountAddress}, got ${actualSmartAccount}`)
                    diagnostic.recommendations.push("Session key was created for different smart account - regenerate")
                }

                // Test balance check (this will fail if session key permissions are wrong)
                try {
                    await checkBackendUSDCBalance(sessionState, "0")
                    console.log("✅ Balance check successful")
                } catch (balanceError) {
                    diagnostic.issues.push(`Balance check failed: ${balanceError instanceof Error ? balanceError.message : 'Unknown error'}`)

                    if (balanceError instanceof Error && balanceError.message.includes("AA23")) {
                        diagnostic.recommendations.push("AA23 error indicates session key signature/permission issue - regenerate session keys with proper permissions")
                    } else {
                        diagnostic.recommendations.push("Balance check failed - check network connectivity and session key validity")
                    }
                }
            }

            const hyperevmClient = sessionState.manager.clients.hyperevm
            if (hyperevmClient) {
                const actualSmartAccount = hyperevmClient.kernelClient.account.address

                if (actualSmartAccount.toLowerCase() !== smartAccountAddress.toLowerCase()) {
                    diagnostic.issues.push(`HyperEVM client smart account mismatch: Expected ${smartAccountAddress}, got ${actualSmartAccount}`)
                    diagnostic.recommendations.push("Session key was created for different smart account - regenerate")
                }
            }

        } catch (testError) {
            diagnostic.issues.push(`Operation test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`)
            diagnostic.recommendations.push("Session key may have insufficient permissions or be corrupted")
        }

        // Step 6: Final recommendations
        if (diagnostic.issues.length === 0) {
            diagnostic.recommendations.push("Session key appears to be working correctly")
        } else {
            diagnostic.recommendations.push("Consider clearing and regenerating session keys to resolve issues")
        }

        return diagnostic

    } catch (error) {
        diagnostic.issues.push(`Diagnostic failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        diagnostic.recommendations.push("Critical session key issue - regenerate session keys from scratch")
        return diagnostic
    }
}

/**
 * Fix common session key issues
 */
export async function fixSessionKeyIssues(
    subOrgId: string,
    smartAccountAddress: string
): Promise<{
    success: boolean
    actions: string[]
    message: string
}> {
    const actions: string[] = []

    try {
        // First, run diagnostics
        const diagnostic = await debugSessionKey(subOrgId, smartAccountAddress)

        if (diagnostic.issues.length === 0) {
            return {
                success: true,
                actions: ["No issues found"],
                message: "Session key is working correctly"
            }
        }

        // For now, we can only recommend manual fixes
        // In the future, you could implement automatic fixes here

        actions.push("Identified issues:", ...diagnostic.issues)
        actions.push("Recommended actions:", ...diagnostic.recommendations)

        return {
            success: false,
            actions,
            message: "Issues found - manual intervention required"
        }

    } catch (error) {
        return {
            success: false,
            actions: ["Failed to diagnose session key issues"],
            message: error instanceof Error ? error.message : "Unknown error"
        }
    }
}

/**
 * Test session key with a simple operation
 */
export async function testSessionKey(
    subOrgId: string,
    smartAccountAddress: string
): Promise<{
    success: boolean
    message: string
    details?: any
}> {
    try {
        console.log("🧪 Testing session key for:", subOrgId)

        const sessionState = await initializeBackendSession(subOrgId, smartAccountAddress)

        if (!sessionState) {
            return {
                success: false,
                message: "Failed to initialize session - session key may not exist or be invalid"
            }
        }

        // Test balance check (minimal operation)
        const balanceResult = await checkBackendUSDCBalance(sessionState, "0")

        return {
            success: true,
            message: "Session key test successful",
            details: {
                currentBalance: balanceResult.currentBalance,
                smartAccountAddress: balanceResult.smartAccountAddress
            }
        }

    } catch (error) {
        let message = "Session key test failed"

        if (error instanceof Error) {
            if (error.message.includes("AA23")) {
                message = "AA23 error: Session key signature/permission validation failed"
            } else {
                message = error.message
            }
        }

        return {
            success: false,
            message,
            details: error
        }
    }
}