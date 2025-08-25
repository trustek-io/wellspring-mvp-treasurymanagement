// src/components/kyc-banner.tsx (Enhanced)
"use client"

import { useRouter } from "next/navigation"
import { Shield, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface KYCBannerProps {
    onDismiss?: () => void
    className?: string
}

export default function KYCBanner({
                                      onDismiss,
                                      className
                                  }: KYCBannerProps) {
    const router = useRouter()

    const handleStartKYC = () => {
        // Simply navigate to the KYC verification page
        // The page will use useKYC() to get the data
        router.push('/dashboard/kyc-verification')
    }

    return (
        <Card className={`${className} border-blue-200 animate-pulse-border-blue`}>
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Shield className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900">
                                Complete Identity Verification
                            </h3>
                            <Badge
                                variant="destructive"
                                className="text-xs bg-orange-500 text-white hover:bg-orange-600 "
                            >
                                Required
                            </Badge>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                            Verify your identity to unlock all features and ensure compliance with regulations.
                        </p>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleStartKYC}
                                size="sm"
                                className="flex items-center gap-1"
                            >
                                Start Verification
                                <ArrowRight className="h-3 w-3" />
                            </Button>

                            {onDismiss && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onDismiss}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    Later
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Dismiss button */}
                    {onDismiss && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDismiss}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                        >
                            ×
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}