"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface AutoDepositCardProps {
    onSetupAutoInvest?: () => void
}

export default function AutoDepositCard({ onSetupAutoInvest }: AutoDepositCardProps) {
    const router = useRouter()

    const handleSetupAutoInvest = () => {
        // Call the optional callback if provided
        onSetupAutoInvest?.()

        // Navigate to the Funding Portal
        router.push("/dashboard/funding")
    }

    return (
        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            {/* Illustration area - simple money illustration */}
            <div className="absolute right-4 top-4 h-32 w-32 opacity-80">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-green-200 to-blue-300 relative overflow-hidden">
                    {/* Simple money bag */}
                    <div className="text-4xl">💰</div>

                    {/* Simple floating dollar signs */}
                    <div className="absolute top-2 right-4 text-lg text-green-600 animate-bounce" style={{ animationDelay: '0s' }}>$</div>
                    <div className="absolute bottom-3 left-3 text-sm text-green-600 animate-bounce" style={{ animationDelay: '0.5s' }}>$</div>
                    <div className="absolute top-6 left-2 text-xs text-green-600 animate-bounce" style={{ animationDelay: '1s' }}>$</div>
                </div>
            </div>

            <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 pr-36">
                    Set Up Auto-Deposit
                </CardTitle>
            </CardHeader>

            <CardContent className="pr-36">
                <p className="text-gray-700 mb-6 text-sm leading-relaxed">
                    Set up Auto-Invest to have a portion of your paycheck automatically sent to your account
                </p>

                <Button
                    onClick={handleSetupAutoInvest}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2"
                >
                    Set Up Auto-Invest
                </Button>
            </CardContent>

            {/* Decorative elements */}
            <div className="absolute top-6 right-20 h-4 w-4 rounded-full bg-blue-400 opacity-60" />
            <div className="absolute top-12 right-32 h-2 w-2 rounded-full bg-orange-400 opacity-60" />
            <div className="absolute bottom-8 right-24 h-3 w-3 rounded-full bg-yellow-400 opacity-60" />
        </Card>
    )
}