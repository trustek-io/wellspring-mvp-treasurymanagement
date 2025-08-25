"use client"

import { TurnkeyProvider } from "@turnkey/sdk-react"
import { EthereumWallet } from "@turnkey/wallet-stamper"
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { arbitrum } from 'wagmi/chains'

import { turnkeyConfig } from "@/config/turnkey"

import { AuthProvider } from "./auth-provider"
import { ThemeProvider } from "./theme-provider"

const wallet = new EthereumWallet()

export const Providers: React.FC<{ children: React.ReactNode }> = ({
                                                                       children,
                                                                   }) => (
    <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
        disableTransitionOnChange
    >
        <OnchainKitProvider
            apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
            chain={arbitrum} // add baseSepolia for testing
            projectId={process.env.NEXT_PUBLIC_CDP_PROJECT_ID}
        >
        <TurnkeyProvider
            config={{
                rpId: turnkeyConfig.passkey.rpId,
                apiBaseUrl: turnkeyConfig.apiBaseUrl,
                defaultOrganizationId: turnkeyConfig.organizationId,
                iframeUrl: "https://auth.turnkey.com",
                wallet: wallet,
            }}
        >
            <AuthProvider>
                  {children}
            </AuthProvider>
        </TurnkeyProvider>
        </OnchainKitProvider>
    </ThemeProvider>
)