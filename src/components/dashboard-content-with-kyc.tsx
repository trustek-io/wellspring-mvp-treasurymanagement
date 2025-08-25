"use client"

import { useKYC } from "@/providers/kyc-provider"

import KYCBanner from "@/components/kyc-banner"

interface DashboardContentWithKYCProps {
  children: React.ReactNode
}

export default function DashboardContentWithKYC({
  children,
}: DashboardContentWithKYCProps) {
  const { needsKYC, isLoading } = useKYC()

  return (
    <div className="flex-1 overflow-auto">
      {/* KYC Banner - shown on all pages if needed */}
      {!isLoading && needsKYC && (
        <div className="p-4 pb-0">
          <KYCBanner />
        </div>
      )}
      {children}
    </div>
  )
}
