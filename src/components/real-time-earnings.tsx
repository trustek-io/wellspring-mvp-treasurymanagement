"use client"

import { useEffect, useState } from "react"
import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWallets } from "@/providers/wallet-provider"
import { useZeroDev } from '@/providers/zerodev-provider'

interface RealTimeEarningsProps {
    baseEarnings?: number
}

export default function RealTimeEarnings({ baseEarnings = 0.000000 }: RealTimeEarningsProps) {
    const { state } = useWallets()
    const { manager } = useZeroDev()
    const { selectedAccount, loading } = state

    const [earnings, setEarnings] = useState(baseEarnings)
    const [increment, setIncrement] = useState(0)
    const [hasBalance, setHasBalance] = useState(false)

    // Get USDC balance from wallet provider
    // const usdcBalance = selectedAccount?.usdcBalance || BigInt(0)
    // let hasBalance = usdcBalance > BigInt(0)
    const isReady = manager.isReady(['arbitrum', 'hyperevm'])

    useEffect(() => {
        let interval: any
        let cancelled = false

        const loadYield = async () => {
            const balances = await manager.getBalances()
            const { actualYield = 0 } =
            balances.hyperevm?.USOLMARKET ?? {}

            setHasBalance(actualYield > 0)
            setEarnings(actualYield)

            // Only start interval if there's a balance and not loading
            if (actualYield > 0 && !loading && !cancelled) {
                interval = setInterval(() => {
                    // Simulate real-time earnings growth
                    setEarnings(prev => prev + (Math.random() * 0.0000001 + 0.0000001))
                }, 2500)
            }
        }

        loadYield()

        return () => {
            cancelled = true
            if (interval) clearInterval(interval)
        }
        // Optionally: you may want to depend only on `manager` and `loading` here
        // to not restart interval on every `increment` or `baseEarnings` change.
    }, [loading, isReady])

    return (
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 min-h-[205px]">
            {/* Background wave pattern */}
            <div className="absolute inset-0 opacity-20">
                <svg className="absolute bottom-0 left-0 w-full h-32" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <path
                        d="M0,50 Q100,20 200,50 T400,50 L400,100 L0,100 Z"
                        fill="currentColor"
                        className="text-blue-600"
                    >
                        <animate
                            attributeName="d"
                            values="M0,50 Q100,20 200,50 T400,50 L400,100 L0,100 Z;
                      M0,50 Q100,80 200,50 T400,50 L400,100 L0,100 Z;
                      M0,50 Q100,20 200,50 T400,50 L400,100 L0,100 Z"
                            dur="8s"
                            repeatCount="indefinite"
                        />
                    </path>
                </svg>
            </div>

            <CardHeader className="relative z-10">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold text-blue-900">
                        Real Time Earnings
                    </CardTitle>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                        <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="relative z-10">
                <div className="text-4xl font-bold text-blue-900">
                    ${earnings.toFixed(7)}
                </div>
                {!hasBalance && (
                    <div className="mt-2 text-sm text-blue-700">
                        <span className="inline-flex items-center">
                            <TrendingUp className="mr-1 h-3 w-3" />
                                <span className="text-blue-600">Add funds to start earning</span>
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}