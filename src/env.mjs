import { vercel } from "@t3-oss/env-core/presets"
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  client: {
    NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
    NEXT_PUBLIC_APPLE_OAUTH_CLIENT_ID: z.string().min(1),
    NEXT_PUBLIC_FACEBOOK_CLIENT_ID: z.string().min(1),
    NEXT_PUBLIC_RP_ID: z.string().optional(),
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().optional(),
    NEXT_PUBLIC_BASE_URL: z.string().min(1),
    NEXT_PUBLIC_ORGANIZATION_ID: z.string().min(1),
    NEXT_PUBLIC_ALCHEMY_API_KEY: z.string().min(1),
    NEXT_PUBLIC_FACEBOOK_AUTH_VERSION: z.string().min(1),
    // ZeroDev Configuration
    NEXT_PUBLIC_ZERODEV_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_ZERODEV_ARBITRUM_RPC: z.string().min(1),
    // USDC Arbitrum Configuration
    NEXT_PUBLIC_USDC_ARBITRUM_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_ENABLE_EARLY_ACCESS: z.string().optional().transform(val => val === 'true'),
  },
  server: {
    NEXT_PUBLIC_RP_ID: z.string().optional(),
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().optional(),
    FACEBOOK_SECRET_SALT: z.string().min(1),
    NEXT_PUBLIC_FACEBOOK_CLIENT_ID: z.string().min(1),
    NEXT_PUBLIC_FACEBOOK_GRAPH_API_VERSION: z.string().min(1),
    TURNKEY_API_PUBLIC_KEY: z.string().min(1),
    TURNKEY_API_PRIVATE_KEY: z.string().min(1),
    NEXT_PUBLIC_BASE_URL: z.string().min(1),
    NEXT_PUBLIC_ORGANIZATION_ID: z.string().min(1),
    NEXT_PUBLIC_ALCHEMY_API_KEY: z.string().min(1),
    COINGECKO_API_KEY: z.string().min(1),
    TURNKEY_WARCHEST_API_PUBLIC_KEY: z.string().min(1),
    TURNKEY_WARCHEST_API_PRIVATE_KEY: z.string().min(1),
    TURNKEY_WARCHEST_ORGANIZATION_ID: z.string().min(1),
    WARCHEST_PRIVATE_KEY_ID: z.string().min(1),
    // ZeroDev Configuration (server-side access)
    NEXT_PUBLIC_ZERODEV_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_ZERODEV_ARBITRUM_RPC: z.string().min(1),
    NEXT_PUBLIC_USDC_ARBITRUM_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_ENABLE_EARLY_ACCESS: z.string().optional().transform(val => val === 'true'),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APPLE_OAUTH_CLIENT_ID:
    process.env.NEXT_PUBLIC_APPLE_OAUTH_CLIENT_ID,
    NEXT_PUBLIC_FACEBOOK_CLIENT_ID: process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID,
    NEXT_PUBLIC_FACEBOOK_GRAPH_API_VERSION:
    process.env.NEXT_PUBLIC_FACEBOOK_GRAPH_API_VERSION,
    NEXT_PUBLIC_FACEBOOK_AUTH_VERSION:
    process.env.NEXT_PUBLIC_FACEBOOK_AUTH_VERSION,
    NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID:
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
    NEXT_PUBLIC_RP_ID: process.env.NEXT_PUBLIC_RP_ID,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:
    process.env.NEXT_PUBLIC_VERCEL_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    FACEBOOK_SECRET_SALT: process.env.FACEBOOK_SECRET_SALT,
    NEXT_PUBLIC_ORGANIZATION_ID: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
    NEXT_PUBLIC_ALCHEMY_API_KEY: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
    TURNKEY_WARCHEST_API_PUBLIC_KEY:
    process.env.TURNKEY_WARCHEST_API_PUBLIC_KEY,
    TURNKEY_WARCHEST_API_PRIVATE_KEY:
    process.env.TURNKEY_WARCHEST_API_PRIVATE_KEY,
    TURNKEY_WARCHEST_ORGANIZATION_ID:
    process.env.TURNKEY_WARCHEST_ORGANIZATION_ID,
    WARCHEST_PRIVATE_KEY_ID: process.env.WARCHEST_PRIVATE_KEY_ID,
    // ZeroDev Environment Variables
    NEXT_PUBLIC_ZERODEV_PROJECT_ID: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID,
    NEXT_PUBLIC_ZERODEV_ARBITRUM_RPC: process.env.NEXT_PUBLIC_ZERODEV_ARBITRUM_RPC,
    NEXT_PUBLIC_USDC_ARBITRUM_ADDRESS: process.env.NEXT_PUBLIC_USDC_ARBITRUM_ADDRESS,
    NEXT_PUBLIC_ENABLE_EARLY_ACCESS: process.env.NEXT_PUBLIC_ENABLE_EARLY_ACCESS,
  },
  extends: [vercel()],
})