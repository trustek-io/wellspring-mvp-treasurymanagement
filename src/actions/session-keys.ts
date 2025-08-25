// src/actions/session-keys.ts
"use server"

import { saveSessionKey, getSessionKey } from "./api"

interface SessionKeyData {
    address: string
    privateKey: string
}

interface SessionKeyResponse {
    id?: string
    sessionKeyData: SessionKeyData
    serializedSessionKey: string
    permissions: Record<string, any>
    chain?: string
}

/**
 * Store approved session key using the API
 */
export async function storeApprovedSessionKey(
    subOrgId: string,
    smartAccountAddress: string,
    sessionKeyData: SessionKeyData,
    serializedSessionKey: string,
    permissions: Record<string, any> = {},
    network: string = "arbitrum"
): Promise<string> {
    console.log("🔐 Storing approved session key:", {
        subOrgId,
        smartAccountAddress,
        sessionKeyAddress: sessionKeyData.address,
        network
    })

    try {
        const apiSessionKeyData = {
            network,
            session_key_address: sessionKeyData.address,
            session_key_private_key: sessionKeyData.privateKey,
            serialized_session_key: serializedSessionKey,
            smart_account_address: smartAccountAddress,
            user_address: smartAccountAddress, // For backwards compatibility
            expires_at: null,
            permissions
        }

        const savedSessionKey = await saveSessionKey(subOrgId, apiSessionKeyData)

        console.log("✅ Session key stored successfully")

        // Return a generated ID (in a real DB this would be the actual ID)
        return `sk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    } catch (error) {
        console.error("❌ Error storing session key:", error)
        throw error
    }
}

/**
 * Get the latest approved session key for a user and smart account
 */
export async function getLatestApprovedSessionKey(
    subOrgId: string,
    smartAccountAddress: string,
    chainId?: string
): Promise<SessionKeyResponse | null> {
    console.log("🔍 Getting latest approved session key:", {
        subOrgId,
        smartAccountAddress,
        chainId
    })

    try {
        const sessionKey = await getSessionKey(subOrgId, chainId)

        if (!sessionKey) {
            console.log("ℹ️ No session key found")
            return null
        }

        // Check if this session key matches the smart account
        if (sessionKey.smart_account_address.toLowerCase() !== smartAccountAddress.toLowerCase()) {
            console.log("ℹ️ Session key found but for different smart account")
            return null
        }

        const result: SessionKeyResponse = {
            sessionKeyData: {
                address: sessionKey.session_key_address,
                privateKey: sessionKey.session_key_private_key
            },
            serializedSessionKey: sessionKey.serialized_session_key,
            permissions: sessionKey.permissions
        }

        console.log("✅ Latest session key found")
        return result

    } catch (error) {
        console.error("❌ Error getting latest session key:", error)
        return null
    }
}

/**
 * Clear all session keys for a user and smart account
 * Note: The current API doesn't support deletion, so this is a placeholder
 */
export async function clearAllSessionKeys(
    subOrgId: string,
    smartAccountAddress: string
): Promise<void> {
    console.log("🧹 Clearing all session keys:", {
        subOrgId,
        smartAccountAddress
    })

    try {
        // In the current API structure, we don't have a delete endpoint
        // So we'll just log this for now
        console.log("⚠️ Session key deletion not implemented in current API")
        console.log("🧹 All session keys cleared (placeholder)")

    } catch (error) {
        console.error("❌ Error clearing session keys:", error)
        throw error
    }
}