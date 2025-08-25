// src/lib/session-key-deserialization-debug.ts
"use server"

import { getSessionKey } from '@/actions/api'
import {
    createSessionKeyClientForChain,
} from '@/lib/unified-session-key-system'
import { createPublicClient, http } from 'viem'
import { arbitrum } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { toECDSASigner } from '@zerodev/permissions/signers'
import {getEntryPoint, KERNEL_V3_1} from '@zerodev/sdk/constants'
import {deserializePermissionAccount} from '@zerodev/permissions'

interface DeserializationDiagnostic {
    step: string
    success: boolean
    error?: string
    data?: any
}

/**
 * Debug session key deserialization step by step
 */
export async function debugSessionKeyDeserialization(
    subOrgId: string,
    smartAccountAddress: string
): Promise<{
    success: boolean
    steps: DeserializationDiagnostic[]
    recommendations: string[]
}> {
    const steps: DeserializationDiagnostic[] = []
    const recommendations: string[] = []

    try {
        // Step 1: Retrieve from database
        steps.push({ step: "1. Retrieving session key from database", success: false })
        const storedSessionKey = await getSessionKey(subOrgId)

        if (!storedSessionKey) {
            steps[0].success = false
            steps[0].error = "No session key found in database"
            recommendations.push("Session key doesn't exist - user needs to create one")
            return { success: false, steps, recommendations }
        }

        steps[0].success = true
        steps[0].data = {
            address: storedSessionKey.session_key_address,
            smartAccount: storedSessionKey.smart_account_address,
            serializedKeyLength: storedSessionKey.serialized_session_key?.length || 0,
            serializedKeyPreview: storedSessionKey.serialized_session_key?.substring(0, 100) + "..."
        }

        // Step 2: Validate serialized key format
        steps.push({ step: "2. Validating serialized key format", success: false })

        if (!storedSessionKey.serialized_session_key) {
            steps[1].error = "Serialized session key is null or empty"
            recommendations.push("Serialized session key is missing - regenerate session keys")
            return { success: false, steps, recommendations }
        }

        if (storedSessionKey.serialized_session_key.length < 100) {
            steps[1].error = "Serialized session key appears too short"
            recommendations.push("Serialized session key may be truncated during storage")
        } else {
            steps[1].success = true
            steps[1].data = { length: storedSessionKey.serialized_session_key.length }
        }

        // Step 3: Validate private key format
        steps.push({ step: "3. Validating private key format", success: false })

        try {
            const sessionKeyAccount = privateKeyToAccount(storedSessionKey.session_key_private_key as `0x${string}`)
            steps[2].success = true
            steps[2].data = {
                derivedAddress: sessionKeyAccount.address,
                matchesStored: sessionKeyAccount.address.toLowerCase() === storedSessionKey.session_key_address.toLowerCase()
            }

            if (sessionKeyAccount.address.toLowerCase() !== storedSessionKey.session_key_address.toLowerCase()) {
                steps[2].error = "Private key doesn't match stored address"
                recommendations.push("Private key/address mismatch - session key corrupted")
            }
        } catch (keyError) {
            steps[2].error = `Invalid private key: ${keyError instanceof Error ? keyError.message : 'Unknown error'}`
            recommendations.push("Private key is malformed - regenerate session keys")
        }

        // Step 4: Create session key signer
        steps.push({ step: "4. Creating session key signer", success: false })

        try {
            const sessionKeyAccount = privateKeyToAccount(storedSessionKey.session_key_private_key as `0x${string}`)
            const sessionKeySigner = await toECDSASigner({ signer: sessionKeyAccount })
            steps[3].success = true
            steps[3].data = { signerCreated: true }
        } catch (signerError) {
            steps[3].error = `Signer creation failed: ${signerError instanceof Error ? signerError.message : 'Unknown error'}`
            recommendations.push("Session key signer creation failed - check private key validity")
        }

        // Step 5: Create public client
        steps.push({ step: "5. Creating public client", success: false })

        try {
            const publicClient = createPublicClient({
                chain: arbitrum,
                transport: http(),
            })
            steps[4].success = true
            steps[4].data = { chainId: publicClient.chain.id }
        } catch (clientError) {
            steps[4].error = `Public client creation failed: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`
            recommendations.push("Network connectivity issue - check RPC endpoints")
        }

        // Step 6: Test deserialization (the critical step)
        steps.push({ step: "6. Deserializing permission account", success: false })

        try {
            const publicClient = createPublicClient({
                chain: arbitrum,
                transport: http(),
            })
            const entryPoint = getEntryPoint("0.7")
            const sessionKeyAccount = privateKeyToAccount(storedSessionKey.session_key_private_key as `0x${string}`)
            const sessionKeySigner = await toECDSASigner({ signer: sessionKeyAccount })

            console.log("🔍 Attempting deserialization with:")
            console.log("- Serialized key length:", storedSessionKey.serialized_session_key.length)
            console.log("- Session key address:", sessionKeyAccount.address)
            console.log("- Entry point:", entryPoint.address)

            const permissionAccount = await deserializePermissionAccount(
                publicClient,
                entryPoint,
                KERNEL_V3_1,
                storedSessionKey.serialized_session_key,
                sessionKeySigner
            )

            steps[5].success = true
            steps[5].data = {
                accountAddress: permissionAccount.address,
                matchesExpected: permissionAccount.address.toLowerCase() === smartAccountAddress.toLowerCase()
            }

            if (permissionAccount.address.toLowerCase() !== smartAccountAddress.toLowerCase()) {
                steps[5].error = "Deserialized account address doesn't match expected smart account"
                recommendations.push("Session key was created for different smart account - regenerate")
            }

        } catch (deserializeError) {
            steps[5].error = `Deserialization failed: ${deserializeError instanceof Error ? deserializeError.message : 'Unknown error'}`
            recommendations.push("Session key deserialization failed - this is likely the root cause of AA23 errors")

            // Add specific recommendations based on error type
            if (deserializeError instanceof Error) {
                if (deserializeError.message.includes("Invalid serialized")) {
                    recommendations.push("Serialized session key format is invalid - check storage/retrieval process")
                } else if (deserializeError.message.includes("signature")) {
                    recommendations.push("Signature validation failed during deserialization - regenerate session keys")
                } else if (deserializeError.message.includes("account")) {
                    recommendations.push("Account recreation failed - check smart account compatibility")
                }
            }
        }

        // Step 7: Test full client creation (if deserialization worked)
        if (steps[5].success) {
            steps.push({ step: "7. Creating full session key client", success: false })

            try {
                const client = await createSessionKeyClientForChain(
                    {
                        address: storedSessionKey.session_key_address as `0x${string}`,
                        privateKey: storedSessionKey.session_key_private_key as `0x${string}`
                    },
                    'arbitrum',
                    storedSessionKey.serialized_session_key
                )

                steps[6].success = true
                steps[6].data = {
                    clientCreated: true,
                    accountAddress: client.kernelClient.account.address
                }

            } catch (clientError) {
                steps[6].error = `Client creation failed: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`
                recommendations.push("Full client creation failed despite successful deserialization")
            }
        }

        // Final assessment
        const allStepsSuccessful = steps.every(step => step.success)

        if (allStepsSuccessful) {
            recommendations.push("All deserialization steps passed - session key should work correctly")
        } else {
            const failedSteps = steps.filter(step => !step.success).map(step => step.step)
            recommendations.push(`Failed steps: ${failedSteps.join(', ')}`)
            recommendations.push("Consider regenerating session keys with proper error handling")
        }

        return {
            success: allStepsSuccessful,
            steps,
            recommendations
        }

    } catch (error) {
        steps.push({
            step: "Critical Error",
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        })
        recommendations.push("Critical failure in deserialization debugging")

        return { success: false, steps, recommendations }
    }
}

/**
 * Test multiple deserialization attempts to check consistency
 */
export async function testDeserializationConsistency(
    subOrgId: string,
    smartAccountAddress: string,
    attempts: number = 5
): Promise<{
    totalAttempts: number
    successfulAttempts: number
    failedAttempts: number
    successRate: number
    errors: string[]
    recommendation: string
}> {
    const errors: string[] = []
    let successCount = 0

    console.log(`🔄 Testing deserialization consistency with ${attempts} attempts...`)

    for (let i = 1; i <= attempts; i++) {
        try {
            console.log(`Attempt ${i}/${attempts}`)
            const result = await debugSessionKeyDeserialization(subOrgId, smartAccountAddress)

            if (result.success) {
                successCount++
                console.log(`✅ Attempt ${i}: Success`)
            } else {
                const mainError = result.steps.find(step => !step.success)?.error || 'Unknown failure'
                errors.push(`Attempt ${i}: ${mainError}`)
                console.log(`❌ Attempt ${i}: ${mainError}`)
            }
        } catch (error) {
            errors.push(`Attempt ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            console.log(`💥 Attempt ${i}: Critical error`)
        }

        // Small delay between attempts
        if (i < attempts) {
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }

    const failedAttempts = attempts - successCount
    const successRate = (successCount / attempts) * 100

    let recommendation: string
    if (successRate === 100) {
        recommendation = "Session key is consistently working - no issues detected"
    } else if (successRate >= 80) {
        recommendation = "Mostly working but some intermittent failures - check network stability"
    } else if (successRate >= 50) {
        recommendation = "Frequent failures detected - likely session key corruption or storage issues"
    } else {
        recommendation = "High failure rate - session key is likely corrupted and should be regenerated"
    }

    return {
        totalAttempts: attempts,
        successfulAttempts: successCount,
        failedAttempts,
        successRate,
        errors: [...new Set(errors)], // Remove duplicates
        recommendation
    }
}