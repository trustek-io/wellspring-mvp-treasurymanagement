export const TURNKEY_IFRAME_CONTAINER_ID = "turnkey-auth-iframe-container-id"
export const TURNKEY_IFRAME_ELEMENT_ID = "turnkey-auth-iframe-element-id"
export const CURVE_TYPE_ED25519 = "API_KEY_CURVE_ED25519" as const
export const CURVE_TYPE_SECP256K1 = "API_KEY_CURVE_SECP256K1" as const
export const PREFERRED_WALLET_KEY = "preferred-wallet"

// ZeroDev Constants
export const ZERODEV_SESSION_KEY_STORAGE_KEY = "zerodev-session-keys"
export const ZERODEV_ACCOUNT_STORAGE_KEY = "zerodev-smart-account"
export const ZERODEV_PAYMASTER_ENABLED_KEY = "zerodev-paymaster-enabled"

// Session Key Permission Types
export const SESSION_KEY_PERMISSIONS = {
    USDC_TRANSFER_ONLY: "usdc_transfer_only",
    USDC_FULL_ACCESS: "usdc_full_access",
    DEFI_OPERATIONS: "defi_operations",
    HYPURR_OPERATIONS: "hypurr_operations", // For future HypurrFi integration
} as const

// Smart Account States
export const SMART_ACCOUNT_STATUS = {
    NOT_DEPLOYED: "not_deployed",
    DEPLOYING: "deploying",
    DEPLOYED: "deployed",
    ERROR: "error",
} as const

export type SessionKeyPermission = typeof SESSION_KEY_PERMISSIONS[keyof typeof SESSION_KEY_PERMISSIONS]
export type SmartAccountStatus = typeof SMART_ACCOUNT_STATUS[keyof typeof SMART_ACCOUNT_STATUS]