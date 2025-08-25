'use client'

import { Auth } from "@turnkey/sdk-react"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DEFAULT_ETHEREUM_ACCOUNTS } from '@turnkey/sdk-server'
import { TurnkeyThemeProvider } from "@turnkey/sdk-react"
import Image from 'next/image'

export default function Landing() {
    const router = useRouter()
    const [customTheme, setCustomTheme] = useState({
        "--text-primary": "#104185",
        "--button-bg": "#104185",
        "--button-text": `var(--Greyscale-100, #ffffff)`,
        "--button-border": "none",
        "--button-disabled-text": "#ffffff",
        "--button-hover-bg": "#104185",
        "--button-hover-text": `var(--Greyscale-100, #ffffff)`,
        "--button-disabled-bg": "#6E8DBC",

        "--input-border": `var(--Greyscale-100, #ffffff)`,
        "--input-focus-border": `var(--Greyscale-100, #6E8DBC)`,

        "--card-bg": "#C7D9F1",
        "--card-shadow": "none",
        "--card-radius": "8px",
        "--card-border": "#C7D9F1",
        "--card-width": "350px"
    })

    useEffect(() => {
        const updateCardWidth = () => {
            const screenWidth = window.innerWidth
            let cardWidth = "400px" // default

            // Calculate responsive card width based on screen size
            if (screenWidth <= 320) {
                cardWidth = "280px" // Small phones (iPhone SE 1st gen)
            } else if (screenWidth <= 375) {
                cardWidth = "320px" // iPhone SE, iPhone 12/13/14 mini
            } else if (screenWidth <= 390) {
                cardWidth = "340px" // iPhone 12/13/14
            } else if (screenWidth <= 414) {
                cardWidth = "360px" // iPhone 12/13/14 Pro Max
            } else if (screenWidth <= 768) {
                cardWidth = "380px" // Larger phones and small tablets
            } else {
                cardWidth = "400px" // Desktop and large tablets
            }

            // Update the theme with new card width
            setCustomTheme(prevTheme => ({
                ...prevTheme,
                "--card-width": cardWidth
            }))
        }

        // Set initial card width
        updateCardWidth()

        // Update on window resize and orientation change
        window.addEventListener('resize', updateCardWidth)
        window.addEventListener('orientationchange', updateCardWidth)

        // Cleanup event listeners
        return () => {
            window.removeEventListener('resize', updateCardWidth)
            window.removeEventListener('orientationchange', updateCardWidth)
        }
    }, [])

    const handleAuthSuccess = async () => {
        console.log("Auth successful!")
        router.push("/dashboard")
    };

    const handleAuthError = (errorMessage: string) => {
        console.log("Auth error: ", errorMessage)
    };

    const authConfig = {
        emailEnabled: true,
        passkeyEnabled: false,
        phoneEnabled: false,
        googleEnabled: false,
        appleEnabled: false,
        facebookEnabled: false,
        walletEnabled: false,
        socialLinking: false,
        sessionLengthSeconds: 3600,
    }

    const emailCustomization = {
        appName: 'Wellspring',
        logoUrl: "https://wellspring.money/wp-content/uploads/2025/07/Untitled-1600-x-300-px-3.png",
    }

    const configOrder = ["socials", "email", "phone", "passkey"]
    const otpConfig = { includeUnverifiedSubOrgs: true }

    return (
        <main className="flex w-full min-h-screen flex-col items-center justify-center overflow-x-hidden px-4">
            <TurnkeyThemeProvider theme={customTheme}>
                <Image
                    src="/wellspring_logo_no_bg.png"
                    alt="Wellspring Logo"
                    width={164}
                    height={164}
                    className="h-62 w-auto mx-auto py-2"
                    priority
                />
                <div className="flex items-center text-center min-h-80 max-w-96">
                    <Auth
                        authConfig={authConfig}
                        configOrder={configOrder}
                        onAuthSuccess={handleAuthSuccess}
                        onError={handleAuthError}
                        emailCustomization={emailCustomization}
                        otpConfig={otpConfig}
                        customAccounts={DEFAULT_ETHEREUM_ACCOUNTS}
                    />
                </div>
            </TurnkeyThemeProvider>
        </main>
    )
}