// src/app/(dashboard)/layout.tsx
import { WalletsProvider } from "@/providers/wallet-provider"
import { KYCProvider } from "@/providers/kyc-provider"
import { ZeroDevProvider } from "@/providers/zerodev-provider"

import { Toaster } from "@/components/ui/sonner"
import NavMenu from "@/components/nav-menu"
import DashboardSidebar from "@/components/dashboard-sidebar"
import DashboardContentWithKYC from "@/components/dashboard-content-with-kyc"
import EarlyAccessOverlay from "@/components/early-access-overlay"
import { HypurrProvider } from "@/providers/hypurr-provider"

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode
}) {
    return (
        <KYCProvider>
            <EarlyAccessOverlay>
                <main className="h-screen bg-white">
                    <HypurrProvider> {/* ← NEW PROVIDER */}
                        <WalletsProvider>
                            <ZeroDevProvider>
                            {/* Top Navigation */}
                            <NavMenu />

                            {/* Main Content Area with Sidebar */}
                            <div className="flex h-[calc(100vh-5rem)]">
                                {/* Sidebar */}
                                <DashboardSidebar />

                                {/* Main Content with KYC Banner */}
                                <DashboardContentWithKYC>
                                    <div className=""> {children}</div>
                                </DashboardContentWithKYC>
                            </div>
                            </ZeroDevProvider>
                        </WalletsProvider>
                    </HypurrProvider>
                </main>
            </EarlyAccessOverlay>
            {/* Toaster outside of overlay so it's always visible */}
            <Toaster />
        </KYCProvider>
    )
}