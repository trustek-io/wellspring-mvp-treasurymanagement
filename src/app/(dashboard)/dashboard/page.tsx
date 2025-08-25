"use client"

import AddFundsCard from "@/components/add-funds-card"
import AutoDepositCard from "@/components/auto-deposit-card"
import BarrelHeroCard from "@/components/barrel-hero-card"
import RealTimeEarnings from "@/components/real-time-earnings"

export default function Dashboard() {
    const handleDeposit = () => console.log("Deposit clicked")
    const handleWithdrawal = () => console.log("Withdrawal clicked")
    const handleSetupAutoInvest = () => console.log("Auto-invest setup clicked")

    return (
        <div className="container mx-auto space-y-6 p-6 sm:p-8 lg:px-12 xl:px-16 2xl:px-24">
            <BarrelHeroCard />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2"><RealTimeEarnings /></div>
                <div className="lg:col-span-1">
                    <AddFundsCard onDeposit={handleDeposit} onWithdrawal={handleWithdrawal} />
                </div>
            </div>
            <AutoDepositCard onSetupAutoInvest={handleSetupAutoInvest} />
        </div>
    )
}
