"use client"

import { useState, useEffect } from "react"
import { Building2, Copy, Eye, EyeOff, Info, Loader, Coins, QrCode, CreditCard, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import QRCode from "react-qr-code"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { api } from "@/actions"
import { useUser } from "@/hooks/use-user"
import { useZeroDev } from "@/providers/zerodev-provider"
import { useKYC } from "@/providers/kyc-provider"
import { truncateAddress } from "@/lib/utils"
import { getOnrampBuyUrl } from '@coinbase/onchainkit/fund'
import { generateSessionToken } from '@/app/utils/sessionTokenApi'

interface BankData {
    accountName: string
    bankName: string
    bankAddress: string
    routingNumber: string
    accountNumber: string
    fullRoutingNumber: string
    fullAccountNumber: string
}

export default function FundingPortal() {
    const { user } = useUser()
    const { state: zeroDevState } = useZeroDev()
    const { kycData } = useKYC()
    const [showRouting, setShowRouting] = useState(false)
    const [showAccount, setShowAccount] = useState(false)
    const [showFullAddress, setShowFullAddress] = useState(false)
    const [bankData, setBankData] = useState<BankData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [creditCardAmount, setCreditCardAmount] = useState<string>("")
    const [isProcessingCreditCard, setIsProcessingCreditCard] = useState(false)
    const [openSection, setOpenSection] = useState<string>("credit-card")

    // Get smart account address for USDC deposits
    const smartAccountAddress = zeroDevState.smartAccountInfo?.address

    useEffect(() => {
        const fetchBankAccount = async () => {
            if (!user?.organization?.organizationId) {
                setLoading(false)
                return
            }

            // Check KYC status first
            if (!kycData || (kycData.kyc_status !== "approved" && kycData.kyc_status !== "incomplete")) {
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                const virtualAccount = await api.getBankAccount(user.organization.organizationId)

                if (virtualAccount && virtualAccount.source_deposit_instructions) {
                    const instructions = virtualAccount.source_deposit_instructions

                    // Transform API data to match component interface
                    const transformedData: BankData = {
                        accountName: instructions.bank_beneficiary_name,
                        bankName: instructions.bank_name,
                        bankAddress: instructions.bank_address,
                        routingNumber: `****${instructions.bank_routing_number.slice(-4)}`,
                        accountNumber: `*********${instructions.bank_account_number.slice(-4)}`,
                        fullRoutingNumber: instructions.bank_routing_number,
                        fullAccountNumber: instructions.bank_account_number
                    }

                    setBankData(transformedData)
                } else {
                    setError("No bank account found. Please contact support to set up your account.")
                }
            } catch (err) {
                console.error("Error fetching bank account:", err)
                setError("Couldn't load bank account information. Please try again or contact support.")
            } finally {
                setLoading(false)
            }
        }

        fetchBankAccount()
    }, [user?.organization?.organizationId, kycData])

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copied to clipboard`)
    }

    const toggleVisibility = (field: 'routing' | 'account' | 'address') => {
        if (field === 'routing') {
            setShowRouting(!showRouting)
        } else if (field === 'account') {
            setShowAccount(!showAccount)
        } else if (field === 'address') {
            setShowFullAddress(!showFullAddress)
        }
    }

    const handleCreditCardFunding = async () => {
        if (!smartAccountAddress) {
            toast.error("Smart account not available")
            return
        }

        const amount = parseFloat(creditCardAmount)
        if (isNaN(amount) || amount < 5 || amount > 500) {
            toast.error("Please enter an amount between $5 and $500")
            return
        }

        try {
            setIsProcessingCreditCard(true)

            // Check if mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768

            // SOLUTION: Open window/tab IMMEDIATELY before any async calls
            let popup: Window | null = null

            if (isMobile) {
                // On mobile, open blank tab immediately to preserve user gesture
                popup = window.open('about:blank', '_blank')
                if (!popup) {
                    toast.error("Please allow popups for this site and try again")
                    return
                }
                // Show loading content
                popup.document.write(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <title>Loading Payment...</title>
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                        </head>
                        <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f8f9fa; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
                            <div style="text-align: center; max-width: 300px;">
                                <div style="width: 40px; height: 40px; border: 3px solid #e0e7ff; border-top: 3px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                                <h2 style="margin: 0 0 10px; color: #374151; font-size: 18px;">Loading Coinbase Pay</h2>
                                <p style="margin: 0; color: #6b7280; font-size: 14px;">Preparing your secure payment...</p>
                            </div>
                            <style>
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            </style>
                        </body>
                    </html>
                `)
            } else {
                // On desktop, open popup immediately
                const width = 500
                const height = 700
                const left = window.screenX + (window.outerWidth - width) / 2
                const top = window.screenY + (window.outerHeight - height) / 2

                popup = window.open(
                    'about:blank',
                    'coinbase-pay',
                    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no`
                )

                if (!popup) {
                    toast.error("Please allow popups for this site and try again")
                    return
                }

                // Show loading content for desktop popup
                popup.document.write(`
                    <!DOCTYPE html>
                    <html>
                        <head><title>Loading...</title></head>
                        <body style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; background: #f8f9fa;">
                            <div style="text-align: center;">
                                <div style="width: 40px; height: 40px; border: 3px solid #e0e7ff; border-top: 3px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                                <div style="color: #374151;">Loading Coinbase Pay...</div>
                            </div>
                            <style>
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            </style>
                        </body>
                    </html>
                `)
            }

            // Now do the async work
            console.log('smartaccount', smartAccountAddress)
            const token = await generateSessionToken({
                addresses: [{
                    address: smartAccountAddress as string,
                    blockchains: ["arbitrum"]
                }],
                assets: ["USDC"]
            }) || ''

            console.log('token', token)

            const onrampBuyUrl = getOnrampBuyUrl({
                presetFiatAmount: amount,
                fiatCurrency: 'USD',
                sessionToken: token
            });

            console.log('onrampBuyUrl', onrampBuyUrl)

            // Navigate the already-open window/tab to the actual URL
            if (popup && !popup.closed) {
                popup.location.href = onrampBuyUrl

                if (isMobile) {
                    toast.success("Payment page opened in new tab")
                } else {
                    // Monitor popup and show success message when closed (desktop only)
                    const checkClosed = setInterval(() => {
                        if (popup.closed) {
                            clearInterval(checkClosed)
                            toast.success("Payment window closed. Please check your account for the transaction.")
                        }
                    }, 1000)
                }
            } else {
                toast.error("Payment window was closed. Please try again.")
            }

        } catch (error) {
            console.error("Error processing credit card funding:", error)
            toast.error("Failed to initiate credit card funding. Please try again.")
        } finally {
            setIsProcessingCreditCard(false)
        }
    }

    const retryFetch = () => {
        setError(null)
        if (user?.organization?.organizationId && kycData && (kycData.kyc_status === "approved" || kycData.kyc_status === "incomplete")) {
            const fetchBankAccount = async () => {
                try {
                    setLoading(true)
                    const virtualAccount = await api.getBankAccount(user.organization.organizationId)

                    if (virtualAccount && virtualAccount.source_deposit_instructions) {
                        const instructions = virtualAccount.source_deposit_instructions

                        const transformedData: BankData = {
                            accountName: instructions.bank_beneficiary_name,
                            bankName: instructions.bank_name,
                            bankAddress: instructions.bank_address,
                            routingNumber: `****${instructions.bank_routing_number.slice(-4)}`,
                            accountNumber: `*********${instructions.bank_account_number.slice(-4)}`,
                            fullRoutingNumber: instructions.bank_routing_number,
                            fullAccountNumber: instructions.bank_account_number
                        }

                        setBankData(transformedData)
                    } else {
                        setError("No bank account found. Please contact support to set up your account.")
                    }
                } catch (err) {
                    console.error("Error fetching bank account:", err)
                    setError("Couldn't load bank account information. Please try again or contact support.")
                } finally {
                    setLoading(false)
                }
            }
            fetchBankAccount()
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto space-y-6 p-6 sm:p-8 lg:px-12 xl:px-16 2xl:px-24">
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                        <Building2 className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-gray-900">
                                            Bank Account Information
                                        </CardTitle>
                                        <p className="text-sm text-gray-600 mt-1">
                                            <Loader className="inline h-4 w-4 animate-spin mr-1" />
                                            Loading your bank account details...
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-1">
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto space-y-6 p-6 sm:p-8 lg:px-12 xl:px-16 2xl:px-24">
            <div className="space-y-4">
                {/* Bank Account Section */}
                <div>
                    <Card
                        className="border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setOpenSection(openSection === "bank" ? "" : "bank")}
                    >
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                        <Building2 className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-gray-900">
                                            Bank Account Deposits
                                        </CardTitle>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Set up direct deposit with your employer
                                        </p>
                                    </div>
                                </div>
                                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${openSection === "bank" ? "rotate-180" : ""}`} />
                            </div>
                        </CardHeader>


                    {openSection === "bank" && (
                        <CardContent className="pt-0">
                            <div className="grid gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                {!kycData || (kycData.kyc_status !== "approved" && kycData.kyc_status !== "incomplete") ? (
                                    <Alert className="border-blue-200 bg-blue-50">
                                        <Info className="h-4 w-4 text-blue-600" />
                                        <AlertDescription className="text-blue-800">
                                            Please complete your KYC application to get bank account information.
                                            If you already completed your KYC, please give us a moment as we are processing your information.
                                        </AlertDescription>
                                    </Alert>
                                ) : error ? (
                                    <Alert variant="destructive">
                                        <AlertDescription className="flex items-center justify-between">
                                            <span>{error}</span>
                                            <Button variant="outline" size="sm" onClick={retryFetch}>
                                                Retry
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                ) : !bankData ? (
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            No bank account information available. Please contact support to set up your account.
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <Card className="border-0 shadow-sm">
                                        <CardContent className="pt-6 space-y-6">
                                            {/* Account Name */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Account Name
                                                </label>
                                                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {bankData.accountName}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                                        onClick={() => copyToClipboard(bankData.accountName, "Account name")}
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Bank Name */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Bank Name
                                                </label>
                                                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {bankData.bankName}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            {bankData.bankAddress}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                                        onClick={() => copyToClipboard(bankData.bankName, "Bank name")}
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Routing Number */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Routing Number
                                                </label>
                                                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {showRouting ? bankData.fullRoutingNumber : bankData.routingNumber}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                                            onClick={() => toggleVisibility('routing')}
                                                        >
                                                            {showRouting ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                                            onClick={() => copyToClipboard(bankData.fullRoutingNumber, "Routing number")}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Account Number */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Account Number
                                                </label>
                                                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {showAccount ? bankData.fullAccountNumber : bankData.accountNumber}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                                            onClick={() => toggleVisibility('account')}
                                                        >
                                                            {showAccount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                                            onClick={() => copyToClipboard(bankData.fullAccountNumber, "Account number")}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {bankData && (
                                <div className="lg:col-span-1 space-y-4">
                                    <Alert className="border-blue-200 bg-blue-50">
                                        <Info className="h-4 w-4 text-blue-600" />
                                        <div className="ml-2">
                                            <h3 className="font-semibold text-blue-900 mb-2">Important Instructions</h3>
                                            <AlertDescription className="text-blue-800 text-sm leading-relaxed">
                                                To set up your direct deposit, copy the routing and account numbers exactly as shown.
                                            </AlertDescription>
                                        </div>
                                    </Alert>

                                    <Alert className="border-orange-200 bg-orange-50">
                                        <Info className="h-4 w-4 text-orange-600" />
                                        <div className="ml-2">
                                            <h3 className="font-semibold text-orange-900 mb-2">Important Notice</h3>
                                            <AlertDescription className="text-orange-800 text-sm leading-relaxed">
                                                A brief video verification call will be required before withdrawal processing.
                                            </AlertDescription>
                                        </div>
                                    </Alert>
                                </div>
                            )}
                        </div>
                     </CardContent>
                    )}
                </Card>
                </div>
                {/* Credit Card Section */}
                {smartAccountAddress && (
                    <Card className="border shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader
                            className="pb-4"
                            onClick={() => setOpenSection(openSection === "credit-card" ? "" : "credit-card")}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                        <CreditCard className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-gray-900">
                                            Fund With Debit Card
                                        </CardTitle>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Instantly deposit up to $500 a week
                                        </p>
                                    </div>
                                </div>
                                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${openSection === "credit-card" ? "rotate-180" : ""}`} />
                            </div>
                        </CardHeader>

                        {openSection === "credit-card" && (
                            <CardContent className="pt-0">
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <div className="lg:col-span-2">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Amount (USD)
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative flex-1 max-w-xs">
                                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                                            $
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={creditCardAmount}
                                                            onChange={(e) => setCreditCardAmount(e.target.value)}
                                                            min="5"
                                                            max="500"
                                                            step="0.01"
                                                            className="pl-8 pr-4 text-right"
                                                        />
                                                    </div>
                                                    <Button
                                                        onClick={handleCreditCardFunding}
                                                        disabled={isProcessingCreditCard || !creditCardAmount}
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        {isProcessingCreditCard ? (
                                                            <>
                                                                <Loader className="h-4 w-4 animate-spin mr-2" />
                                                                Processing...
                                                            </>
                                                        ) : (
                                                            "Fund Now"
                                                        )}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-gray-600">
                                                    Minimum: $5.00 • Maximum: $500.00 per week
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-1">
                                        <Alert className="border-blue-200 bg-blue-50">
                                            <CreditCard className="h-4 w-4 text-blue-600" />
                                            <div className="ml-2">
                                                <h3 className="font-semibold text-blue-900 mb-2">Instant Funding</h3>
                                                <AlertDescription className="text-blue-800 text-sm leading-relaxed">
                                                    <ul className="space-y-1">
                                                        <li>• Funds available immediately</li>
                                                        <li>• Secure payment processing</li>
                                                        <li>• Up to $500 per week</li>
                                                        <li>• No hidden fees</li>
                                                    </ul>
                                                </AlertDescription>
                                            </div>
                                        </Alert>
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                )}

                {/* Crypto Section */}
                {smartAccountAddress && (
                    <Card className="border shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader
                            className="pb-4"
                            onClick={() => setOpenSection(openSection === "crypto" ? "" : "crypto")}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                                        <Coins className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-gray-900">
                                            Crypto Deposits
                                        </CardTitle>
                                        <p className="text-sm text-gray-600 mt-1">
                                            USDC on Arbitrum or USDT0 on HyperEVM
                                        </p>
                                    </div>
                                </div>
                                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${openSection === "crypto" ? "rotate-180" : ""}`} />
                            </div>
                        </CardHeader>

                        {openSection === "crypto" && (
                            <CardContent className="pt-0">
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <div className="lg:col-span-2">
                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <p className="text-sm text-gray-700">
                                                    You can deposit either <strong>USDC</strong> (on Arbitrum One) or <strong>USDT0</strong> (on HyperEVM) to the address below.
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Your Wellspring Wallet Address
                                                </label>
                                                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                                   <span className="text-sm font-medium text-gray-900 font-mono">
                                       {showFullAddress ? smartAccountAddress : truncateAddress(smartAccountAddress)}
                                   </span>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                                            onClick={() => toggleVisibility('address')}
                                                        >
                                                            {showFullAddress ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                                            onClick={() => copyToClipboard(smartAccountAddress, "Wallet address")}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-1 space-y-4">
                                        <Card className="border-0 shadow-sm">
                                            <CardHeader className="pb-4">
                                                <div className="flex items-center gap-2">
                                                    <QrCode className="h-5 w-5 text-gray-600" />
                                                    <CardTitle className="text-lg font-semibold text-gray-900">
                                                        QR Code
                                                    </CardTitle>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex flex-col items-center space-y-4">
                                                <div className="p-4 bg-white rounded-lg border border-gray-200">
                                                    <QRCode
                                                        value={smartAccountAddress}
                                                        size={140}
                                                        level="M"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-600 text-center">
                                                    Scan with your wallet app
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Alert className="border-green-200 bg-green-50">
                                            <Coins className="h-4 w-4 text-green-600" />
                                            <div className="ml-2">
                                                <h3 className="font-semibold text-green-900 mb-2">Supported Tokens</h3>
                                                <AlertDescription className="text-green-800 text-sm leading-relaxed">
                                                    <ul className="space-y-1">
                                                        <li><strong>USDC</strong> on Arbitrum One</li>
                                                        <li><strong>USDT0</strong> on HyperEVM</li>
                                                    </ul>
                                                    <p className="mt-2">Use the correct network for each token.</p>
                                                </AlertDescription>
                                            </div>
                                        </Alert>
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                )}
            </div>
        </div>
    )
}