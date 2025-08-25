// src/lib/sst-resources.ts - Separate utility for SST Resources
"use server"

/**
 * Server-only utility for accessing SST Resources
 * This avoids importing SST Resources in client-side code
 */
/**
 * Get SST Resource value safely
 */
export const getSSResourceValue = async (resourceKey: string): Promise<string | undefined> => {
    try {
        const {Resource} = await import('sst')
        // @ts-ignore
        return Resource?.[resourceKey]?.value
    } catch (error) {
        console.warn(`Failed to get SST resource ${resourceKey}:`, error)
        return undefined
    }
}

/**
 * Get ETH ARB Funder Private Key from SST Resource or environment
 */
export const getEthArbFunderPrivateKey = async (): Promise<string> => {
    // Try environment variable first
    if (process.env.ETH_ARB_FUNDER_PRIVATE_KEY) {
        return process.env.ETH_ARB_FUNDER_PRIVATE_KEY
    }
    const {Resource} = await import('sst')
    // Fallback to SST Resource only if available
    if (Resource) {
        const resourceValue = await getSSResourceValue('ETH_ARB_FUNDER_PRIVATE_KEY')
        if (resourceValue) {
            return resourceValue
        }
    }

    throw new Error('ETH_ARB_FUNDER_PRIVATE_KEY not found in environment or SST Resources')
}

export const getEtherscanKey = async (): Promise<string> => {
    // Try environment variable first
    if (process.env.ETHERSCAN_API_KEY) {
        return process.env.ETHERSCAN_API_KEY
    }
    const {Resource} = await import('sst')
    // Fallback to SST Resource only if available
    if (Resource) {
        const resourceValue = await getSSResourceValue('ETHERSCAN_API_KEY')
        if (resourceValue) {
            return resourceValue
        }
    }

    throw new Error('ETHERSCAN_API_KEY not found in environment or SST Resources')
}

/**
 * Generic function to get any SST resource with environment fallback
 */
export const getResourceOrEnv = async (resourceKey: string, envKey?: string): Promise<string> => {
    const envVariable = envKey || resourceKey

    // Try environment variable first
    if (process.env[envVariable]) {
        return process.env[envVariable]!
    }

    const {Resource} = await import('sst')
    // Fallback to SST Resource only if available
    if (Resource) {
        const resourceValue = await getSSResourceValue(resourceKey)
        if (resourceValue) {
            return resourceValue
        }
    }

    throw new Error(`${resourceKey} not found in environment or SST Resources`)
}