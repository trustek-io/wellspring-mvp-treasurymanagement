"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ScheduleCallDialog from "./schedule-call-dialog"

interface AddFundsCardProps {
  onDeposit?: () => void
  onWithdrawal?: () => void
}

export default function AddFundsCard({
  onDeposit,
  onWithdrawal,
}: AddFundsCardProps) {
  const router = useRouter()
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false)

  const handleDeposit = () => {
    // Call the optional callback if provided
    onDeposit?.()

    // Navigate to the Funding Portal
    router.push("/dashboard/funding")
  }

  const handleWithdrawal = () => {
    onWithdrawal?.()
    setIsWithdrawalDialogOpen(true)
  }

  return (
    <>
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Add Funds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleDeposit}
            className="w-full bg-blue-600 py-3 text-lg font-semibold text-white hover:bg-blue-700"
            size="lg"
          >
            Deposit
          </Button>

          <Button
            onClick={handleWithdrawal}
            variant="outline"
            className="w-full border-gray-300 py-3 text-lg font-semibold text-gray-700 hover:bg-gray-50"
            size="lg"
          >
            Withdrawal
          </Button>
        </CardContent>
      </Card>

      {/* Withdrawal Dialog */}
      <ScheduleCallDialog
        open={isWithdrawalDialogOpen}
        onClose={() => setIsWithdrawalDialogOpen(false)}
        title="Schedule a Withdrawal Call"
        subTitle="Our team will help you process your withdrawal request and answer any questions about your account."
      />
    </>
  )
}
