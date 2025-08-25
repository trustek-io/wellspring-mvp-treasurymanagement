"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Zap, CheckCircle, XCircle, Settings } from "lucide-react"

import { useZeroDev } from "@/providers/zerodev-provider"
import { useUser } from "@/hooks/use-user"
import { useWallets } from "@/providers/wallet-provider"
import { useTurnkey } from "@turnkey/sdk-react"
import { getCrossChainManager } from "@/lib/simplified-cross-chain-manager"

export default function WorkingCrossChainComponent() {
    const { state: zeroDevState } = useZeroDev()
    const { user } = useUser()
    const { state: walletState } = useWallets()
    const { indexedDbClient: client } = useTurnkey()

    // Get the cross-chain manager
    const manager = getCrossChainManager()

    // Local state
    const [amount, setAmount] = useState("10")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastTxHash, setLastTxHash] = useState<string | null>(null)
    const [balances, setBalances] = useState<any>(null)
    const [progress, setProgress] = useState<string>("")
    const [isInitializing, setIsInitializing] = useState(false)

    // Computed states
    const hasSmartAccount = !!zeroDevState.smartAccountInfo?.address
    const isReady = manager.isReady(['arbitrum', 'hyperevm'])
    const status = manager.getStatus()

    // FIXED: Get the correct subOrgId from Turnkey user
    const subOrgId = user?.organization?.organizationId

    // Auto-initialize on page load
    useEffect(() => {
        const autoInitialize = async () => {
            // Only initialize if we have all required data and haven't initialized yet
            if (!user || !walletState.selectedAccount || !client || !subOrgId || isInitializing) {
                return
            }

            setIsInitializing(true)
            setProgress("Initializing...")

            try {
                let smartAccountAddress = zeroDevState.smartAccountInfo?.address

                // Step 1: Create smart account if it doesn't exist
                if (!smartAccountAddress) {
                    setProgress("Creating smart account...")
                    // await createSmartAccount()

                    // FIXED: Better approach - wait for the hasSmartAccount state to change
                    // instead of polling zeroDevState directly
                    setProgress("Waiting for smart account confirmation...")

                    // We'll let the useEffect below handle the continuation
                    // when hasSmartAccount becomes true
                    return
                }

                // Step 2: If smart account already exists, proceed with session key setup
                await continueSessionKeySetup(smartAccountAddress)

            } catch (error) {
                console.error("Auto-initialization error:", error)
                setError(`Initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`)
                setIsInitializing(false)
            }
        }

        autoInitialize()
    }, [user, walletState.selectedAccount, client, subOrgId])

    // FIXED: Separate useEffect to handle smart account creation completion
    useEffect(() => {
        const continueAfterSmartAccount = async () => {
            // Only continue if we're initializing and smart account was just created
            if (!isInitializing || !hasSmartAccount || !zeroDevState.smartAccountInfo?.address) {
                return
            }

            try {
                await continueSessionKeySetup(zeroDevState.smartAccountInfo.address)
            } catch (error) {
                console.error("Session key setup error:", error)
                setError(`Session key setup failed: ${error instanceof Error ? error.message : "Unknown error"}`)
                setIsInitializing(false)
            }
        }

        continueAfterSmartAccount()
    }, [hasSmartAccount, isInitializing, zeroDevState.smartAccountInfo?.address])

    // FIXED: Extract session key setup into separate function
    const continueSessionKeySetup = async (smartAccountAddress: string) => {
        if (!user || !walletState.selectedAccount || !client || !subOrgId) {
            throw new Error("Missing required data for session key setup")
        }

        try {
            setProgress("Checking for existing session keys...")

            // Import the session key utility
            const { getSignerFromZeroDevProvider } = await import("@/lib/session-key-utils")
            const ownerSigner = await getSignerFromZeroDevProvider(user, walletState, client)

            // Try to setup (this will use existing keys if available)
            setProgress("Setting up session keys...")
            await manager.setupForChains(
                ['arbitrum', 'hyperevm'],
                ownerSigner,
                walletState.selectedAccount.address,
                smartAccountAddress,
                subOrgId
            )

            setProgress("Session keys ready!")

            // Clear progress after a moment
            setTimeout(() => setProgress(''), 3000)

        } catch (setupError) {
            console.warn("Could not auto-setup session keys:", setupError)
            setProgress("Smart account ready - session keys need manual setup")
            setTimeout(() => setProgress(''), 3000)
        } finally {
            setIsInitializing(false)
        }
    }

    // Load balances when ready
    useEffect(() => {
        console.log("🔄 useEffect triggered - isReady:", isReady, "hasSmartAccount:", hasSmartAccount)
        if (isReady) {
            loadBalances()
        }
    }, [isReady])

    const loadBalances = async () => {
        console.log("🔍 loadBalances called, isReady:", isReady)
        console.log("🔍 Manager status:", status)

        if (!isReady) {
            console.log("❌ Manager not ready, skipping balance load")
            return
        }

        try {
            console.log("💰 Loading balances...")
            const currentBalances = await manager.getBalances()
            console.log("✅ Balances loaded:", currentBalances)
            setBalances(currentBalances)
        } catch (error) {
            console.error("❌ Error loading balances:", error)
            setError("Failed to load balances: " + (error instanceof Error ? error.message : "Unknown error"))
        }
    }

    const handleManualSetup = async () => {
        if (!user || !walletState.selectedAccount || !client || !subOrgId || !hasSmartAccount) {
            setError("Missing required data for manual setup")
            return
        }

        setIsLoading(true)
        setError(null)
        setProgress("")

        try {
            // Get Turnkey signer
            setProgress("Getting Turnkey signer...")
            const { getSignerFromZeroDevProvider } = await import("@/lib/session-key-utils")
            const ownerSigner = await getSignerFromZeroDevProvider(user, walletState, client)

            // Setup cross-chain session keys
            setProgress("Setting up cross-chain session keys...")
            await manager.setupForChains(
                ['arbitrum', 'hyperevm'],
                ownerSigner,
                walletState.selectedAccount.address,
                zeroDevState.smartAccountInfo!.address,
                subOrgId
            )

            setProgress("Setup completed!")
            setTimeout(() => setProgress(""), 2000)

            // Load balances
            setTimeout(loadBalances, 1000)

        } catch (error) {
            console.error("Manual setup error:", error)
            setError(error instanceof Error ? error.message : "Setup failed")
        } finally {
            setIsLoading(false)
        }
    }

    const handleFullAutomation = async () => {
        if (!isReady) {
            setError("Cross-chain setup not ready")
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const result = await manager.bridgeAndSupply(amount)
            setLastTxHash(result.bridgeTxHash)

            console.log("✅ Automation completed:", result)
            setTimeout(loadBalances, 5000)

        } catch (error) {
            console.error("Automation error:", error)
            setError(error instanceof Error ? error.message : "Automation failed")
        } finally {
            setIsLoading(false)
        }
    }

    const handleReset = async () => {
        if (!user || !walletState.selectedAccount || !hasSmartAccount || !subOrgId) return

        setIsLoading(true)
        try {
            await manager.reset(
                walletState.selectedAccount.address,
                zeroDevState.smartAccountInfo!.address,
                subOrgId
            )
            setBalances(null)
            setLastTxHash(null)
            setError(null)
        } catch (error) {
            setError(error instanceof Error ? error.message : "Reset failed")
        } finally {
            setIsLoading(false)
        }
    }

    const handleTestArbitrumTransfer = async () => {
        if (!isReady) return

        setIsLoading(true)
        try {
            const txHash = await manager.executeArbitrumUSDCTransfer(
                "0x7936128C56c001809CbF07726607AfF58cc7Fbc3",
                "0.1"
            )
            setLastTxHash(txHash)
            setTimeout(loadBalances, 3000)
        } catch (error) {
            setError(error instanceof Error ? error.message : "Transfer failed")
        } finally {
            setIsLoading(false)
        }
    }

    const handleTestHyperEVMTransfer = async () => {
        if (!isReady) return

        setIsLoading(true)
        try {
            const txHash = await manager.executeHyperEVMUSDT0Transfer(
                "0x7936128C56c001809CbF07726607AfF58cc7Fbc3",
                "1.0"
            )
            setLastTxHash(txHash)
            setTimeout(loadBalances, 3000)
        } catch (error) {
            setError(error instanceof Error ? error.message : "Transfer failed")
        } finally {
            setIsLoading(false)
        }
    }

    const handleTestHypurrDeposit = async () => {
        if (!isReady) return

        setIsLoading(true)
        try {
            const result = await manager.executeHypurrDeposit("0.944838")
            setLastTxHash(result.depositTxHash)
            setTimeout(loadBalances, 3000)
        } catch (error) {
            setError(error instanceof Error ? error.message : "Deposit failed")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Cross-Chain Automation
                        <Badge variant="outline" className="ml-auto">
                            Unified Session Keys
                        </Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                        Automated cross-chain operations using session keys
                    </p>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Error Display */}
                    {error && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription className="flex items-center justify-between">
                                <span>{error}</span>
                                <Button variant="outline" size="sm" onClick={() => setError(null)}>
                                    Clear
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Prerequisites */}
                    {!user && (
                        <Alert>
                            <AlertDescription>
                                Please connect your wallet to enable cross-chain operations.
                            </AlertDescription>
                        </Alert>
                    )}

                    {user && (
                        <>
                            {/* Auto-initialization Progress */}
                            {isInitializing && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                        <span className="text-blue-800 font-medium">Auto-initializing...</span>
                                    </div>
                                    {progress && (
                                        <p className="text-sm text-blue-600 mt-2">{progress}</p>
                                    )}
                                </div>
                            )}

                            {/* Debug Info - Show subOrgId for debugging */}
                            {process.env.NODE_ENV === 'development' && (
                                <>
                                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                        <p><strong>Debug Info:</strong></p>
                                        <p>SubOrgId: {subOrgId || 'Not available'}</p>
                                        <p>User Address: {walletState.selectedAccount?.address || 'Not available'}</p>
                                        <p>Smart Account: {zeroDevState.smartAccountInfo?.address || 'Not available'}</p>
                                        <p>Is Initializing: {isInitializing ? 'Yes' : 'No'}</p>
                                    </div>

                                    {/* Session Key Debug Tools */}
                                    {isReady && (
                                        <div className="p-4 border rounded-lg bg-red-50">
                                            <h4 className="font-medium mb-3">🔧 Session Key Debug Tools</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                <Button
                                                    onClick={async () => {
                                                        console.log("🔍 === SESSION KEY DEBUG START ===")

                                                        const client = manager.clients.arbitrum
                                                        if (!client) {
                                                            console.error("❌ No Arbitrum client found")
                                                            return
                                                        }

                                                        // Check session key data
                                                        console.log("📋 Session Key Data:", {
                                                            hasSessionKeyData: !!manager.sessionKeyData,
                                                            sessionKeyAddress: manager.sessionKeyData?.address,
                                                            sessionKeyPrivateKey: manager.sessionKeyData?.privateKey ? "✅ Present" : "❌ Missing",
                                                            chains: Object.keys(manager.sessionKeyData?.chains || {}),
                                                        })

                                                        // Check chain-specific data
                                                        const chainData = manager.sessionKeyData?.chains.arbitrum
                                                        console.log("📋 Arbitrum Chain Data:", {
                                                            isApproved: chainData?.isApproved,
                                                            hasSerializedKey: !!chainData?.serializedSessionKey,
                                                            sessionKeyId: chainData?.sessionKeyId,
                                                            smartAccountAddress: chainData?.smartAccountAddress,
                                                        })

                                                        // Check client configuration
                                                        console.log("📋 Client Info:", {
                                                            chainId: client.chainId,
                                                            hasKernelClient: !!client.kernelClient,
                                                            hasSessionKeySigner: !!client.sessionKeySigner,
                                                            hasPublicClient: !!client.publicClient,
                                                            smartAccountAddress: client.kernelClient?.account?.address,
                                                        })

                                                        console.log("🔍 === SESSION KEY DEBUG END ===")
                                                    }}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Debug Session Keys
                                                </Button>
                                                <Button
                                                    onClick={async () => {
                                                        console.log("🧪 === SIMPLE TRANSACTION TEST START ===")

                                                        const client = manager.clients.arbitrum
                                                        if (!client) {
                                                            console.error("❌ No Arbitrum client found")
                                                            return
                                                        }

                                                        try {
                                                            const smartAccountAddress = client.kernelClient.account.address
                                                            console.log("📍 Smart account address:", smartAccountAddress)

                                                            // Test simple balance call
                                                            console.log("📝 Testing simple balance call...")
                                                            const callData = await client.kernelClient.account.encodeCalls([
                                                                {
                                                                    to: client.config.contracts.USDC.address,
                                                                    value: BigInt(0),
                                                                    data: "0x70a08231000000000000000000000000" + smartAccountAddress.slice(2), // balanceOf
                                                                },
                                                            ])
                                                            console.log("✅ Call encoding successful, length:", callData.length)

                                                            // Try the user operation
                                                            console.log("🔄 Testing simple user operation...")
                                                            const userOpHash = await client.kernelClient.sendUserOperation({
                                                                callData: callData,
                                                            })

                                                            console.log("✅ User operation sent:", userOpHash)

                                                        } catch (error) {
                                                            console.error("❌ Simple transaction test failed:", error)

                                                            if (error instanceof Error && error.message.includes("AA23")) {
                                                                console.error("🚨 AA23 error detected - session key signature issue!")
                                                                alert("Session key signature issue detected! Check console for details.")
                                                            }
                                                        }

                                                        console.log("🧪 === SIMPLE TRANSACTION TEST END ===")
                                                    }}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Test Simple TX
                                                </Button>
                                                <Button
                                                    onClick={async () => {
                                                        if (!user || !walletState.selectedAccount || !client || !subOrgId || !hasSmartAccount) {
                                                            setError("Missing required data for regeneration")
                                                            return
                                                        }

                                                        setIsLoading(true)
                                                        try {
                                                            const { getSignerFromZeroDevProvider } = await import("@/lib/session-key-utils")
                                                            const ownerSigner = await getSignerFromZeroDevProvider(user, walletState, client)

                                                            console.log("🔄 === FORCING FRESH SESSION KEYS ===")

                                                            // FIXED: Force clear by overwriting with invalid data
                                                            console.log("🧹 Forcing session key invalidation...")
                                                            const { saveSessionKey } = await import("@/actions/api")

                                                            await saveSessionKey(subOrgId, {
                                                                network: "invalid",
                                                                session_key_address: "0x0000000000000000000000000000000000000000",
                                                                session_key_private_key: "0x0000000000000000000000000000000000000000000000000000000000000000",
                                                                serialized_session_key: "invalid",
                                                                smart_account_address: zeroDevState.smartAccountInfo!.address,
                                                                user_address: walletState.selectedAccount.address,
                                                                expires_at: new Date(0).toISOString(),
                                                                permissions: {}
                                                            })

                                                            // Reset manager state to force fresh creation
                                                            manager.sessionKeyData = null
                                                            manager.clients = {}

                                                            // Wait a moment
                                                            await new Promise(resolve => setTimeout(resolve, 2000))

                                                            // Setup fresh session keys
                                                            console.log("🆕 Setting up completely fresh session keys...")
                                                            await manager.setupForChains(
                                                                ['arbitrum', 'hyperevm'],
                                                                ownerSigner,
                                                                walletState.selectedAccount.address,
                                                                zeroDevState.smartAccountInfo!.address,
                                                                subOrgId
                                                            )

                                                            console.log("✅ Fresh session keys created successfully")

                                                            // Refresh balances
                                                            setTimeout(loadBalances, 2000)

                                                        } catch (error) {
                                                            setError(error instanceof Error ? error.message : "Fresh key creation failed")
                                                        } finally {
                                                            setIsLoading(false)
                                                        }
                                                    }}
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isLoading}
                                                    className="bg-red-100 hover:bg-red-200"
                                                >
                                                    Force Fresh Keys
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Status Overview */}
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
                                <h4 className="font-medium mb-3">🎯 Status</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="font-medium">Smart Account</p>
                                        <p className={hasSmartAccount ? "text-green-600" : "text-gray-600"}>
                                            {hasSmartAccount ? "✅ Ready" : "⏳ Creating..."}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-medium">Session Keys</p>
                                        <p className={status.hasSessionKey ? "text-green-600" : "text-gray-600"}>
                                            {status.hasSessionKey ? "✅ Ready" : "❌ Not Setup"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-medium">Chains</p>
                                        <p className="text-green-600">{status.approvedChains.length} / 2</p>
                                        <p className="text-xs text-gray-600">
                                            {status.approvedChains.join(', ') || 'None'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-medium">Automation</p>
                                        <p className={isReady ? "text-green-600" : "text-orange-600"}>
                                            {isReady ? "✅ Ready" : "⚠️ Setup Required"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Manual Setup Section - Only show if not ready and not initializing */}
                            {!isReady && !isInitializing && hasSmartAccount && (
                                <div className="p-4 border rounded-lg">
                                    <h4 className="font-medium mb-3">🔧 Manual Setup</h4>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Session keys need to be set up manually for cross-chain operations.
                                    </p>

                                    {/* Progress */}
                                    {progress && (
                                        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                                <span className="text-blue-800">{progress}</span>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleManualSetup}
                                        disabled={isLoading || !subOrgId}
                                        className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Setting up...
                                            </>
                                        ) : !subOrgId ? (
                                            "⚠️ Missing SubOrg ID - Please refresh"
                                        ) : (
                                            "🔑 Setup Cross-Chain Session Keys"
                                        )}
                                    </Button>
                                </div>
                            )}

                            {/* Balances */}
                            {(balances || hasSmartAccount) && (
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <h4 className="font-medium mb-3 flex items-center justify-between">
                                        💰 Balances
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-600">
                                                Ready: {isReady ? "✅" : "❌"}
                                            </span>
                                            <Button
                                                onClick={loadBalances}
                                                variant="outline"
                                                size="sm"
                                                disabled={isLoading || isInitializing}
                                            >
                                                Refresh
                                            </Button>
                                        </div>
                                    </h4>
                                    {balances ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {balances.arbitrum && (
                                                <div>
                                                    <p className="font-medium text-blue-600">🔵 Arbitrum</p>
                                                    <p className="text-sm">
                                                        USDC: {parseFloat(balances.arbitrum.USDC?.formatted || '0').toFixed(6)}
                                                    </p>
                                                </div>
                                            )}
                                            {balances.hyperevm && (
                                                <div>
                                                    <p className="font-medium text-green-600">🟢 HyperEVM</p>
                                                    <p className="text-sm">
                                                        USDT0: {parseFloat(balances.hyperevm.USDT0?.formatted || '0').toFixed(6)}
                                                    </p>
                                                </div>
                                            )}
                                            {balances.arbitrum?.error && (
                                                <div className="col-span-2">
                                                    <p className="text-red-600 text-sm">Arbitrum Error: {balances.arbitrum.error}</p>
                                                </div>
                                            )}
                                            {balances.hyperevm?.error && (
                                                <div className="col-span-2">
                                                    <p className="text-red-600 text-sm">HyperEVM Error: {balances.hyperevm.error}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-600">
                                            <p>No balances loaded yet.</p>
                                            <p className="text-xs mt-1">
                                                Manager ready: {isReady ? "Yes" : "No"} |
                                                Smart account: {hasSmartAccount ? "Yes" : "No"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Main Operations */}
                            {isReady && (
                                <div className="space-y-4">
                                    {/* Full Automation */}
                                    <div className="p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50">
                                        <h4 className="font-medium mb-3">🤖 Full Automation</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-sm font-medium">Amount (USDC)</label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="1"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    className="w-32"
                                                />
                                            </div>
                                            <Button
                                                onClick={handleFullAutomation}
                                                disabled={isLoading || !amount}
                                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Executing...
                                                    </>
                                                ) : (
                                                    `🚀 Bridge ${amount} USDC → Supply to Hypurr`
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Individual Tests */}
                                    <div className="p-4 border rounded-lg">
                                        <h4 className="font-medium mb-3">🔧 Test Operations</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                            <Button
                                                onClick={handleTestArbitrumTransfer}
                                                disabled={isLoading}
                                                variant="outline"
                                                className="text-blue-600"
                                            >
                                                Test USDC Transfer
                                            </Button>
                                            <Button
                                                onClick={handleTestHyperEVMTransfer}
                                                disabled={isLoading}
                                                variant="outline"
                                                className="text-green-600"
                                            >
                                                Test USDT0 Transfer
                                            </Button>
                                            <Button
                                                onClick={handleTestHypurrDeposit}
                                                disabled={isLoading}
                                                variant="outline"
                                                className="text-purple-600"
                                            >
                                                Test Hypurr Deposit
                                            </Button>
                                            <Button
                                                onClick={async () => {
                                                    if (!isReady) return

                                                    setIsLoading(true)
                                                    try {
                                                        console.log("🔍 === BRIDGE DEBUG START ===")

                                                        const client = manager.clients.arbitrum
                                                        const smartAccount = client.kernelClient.account.address
                                                        const bridgeContract = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"

                                                        // FIXED: Import getTokenBalance
                                                        const { getTokenBalance } = await import("@/lib/unified-session-key-system")

                                                        // Check USDC balance
                                                        const balance = await getTokenBalance(client, 'USDC', smartAccount)
                                                        console.log("💰 Smart account USDC balance:", balance.formatted)

                                                        // Check USDC allowance for bridge
                                                        const allowance = await client.publicClient.readContract({
                                                            address: client.config.contracts.USDC.address,
                                                            abi: client.config.contracts.USDC.abi,
                                                            functionName: 'allowance',
                                                            args: [smartAccount, bridgeContract],
                                                        })
                                                        console.log("🔓 Bridge allowance:", Number(allowance) / 1e6, "USDC")

                                                        // Check bridge contract USDC balance
                                                        const bridgeBalance = await client.publicClient.readContract({
                                                            address: client.config.contracts.USDC.address,
                                                            abi: client.config.contracts.USDC.abi,
                                                            functionName: 'balanceOf',
                                                            args: [bridgeContract],
                                                        })
                                                        console.log("🌉 Bridge contract USDC balance:", Number(bridgeBalance) / 1e6, "USDC")

                                                        // Check ETH balance for gas
                                                        const ethBalance = await client.publicClient.getBalance({
                                                            address: smartAccount
                                                        })
                                                        console.log("⛽ Smart account ETH balance:", Number(ethBalance) / 1e18, "ETH")

                                                        const debugInfo = `Debug Results:
Smart Account USDC: ${balance.formatted}
Bridge Allowance: ${(Number(allowance) / 1e6).toFixed(6)} USDC
Bridge Contract USDC: ${(Number(bridgeBalance) / 1e6).toFixed(6)} USDC
Smart Account ETH: ${(Number(ethBalance) / 1e18).toFixed(6)} ETH

Bridge Contract: ${bridgeContract}`

                                                        alert(debugInfo)
                                                        console.log("📋 Debug Summary:", {
                                                            smartAccountUSDC: balance.formatted,
                                                            bridgeAllowance: Number(allowance) / 1e6,
                                                            bridgeContractUSDC: Number(bridgeBalance) / 1e6,
                                                            smartAccountETH: Number(ethBalance) / 1e18,
                                                            bridgeContract
                                                        })

                                                        console.log("🔍 === BRIDGE DEBUG END ===")

                                                    } catch (error) {
                                                        console.error("Debug failed:", error)
                                                        setError("Debug failed: " + (error instanceof Error ? error.message : "Unknown error"))
                                                    } finally {
                                                        setIsLoading(false)
                                                    }
                                                }}
                                                disabled={isLoading}
                                                variant="outline"
                                                className="text-orange-600"
                                            >
                                                Debug Bridge
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Reset */}
                                    <Button
                                        onClick={handleReset}
                                        disabled={isLoading || !subOrgId}
                                        variant="outline"
                                        className="w-full text-red-600 hover:text-red-700"
                                    >
                                        <Settings className="mr-2 h-4 w-4" />
                                        Reset Session Keys
                                    </Button>
                                </div>
                            )}

                            {/* Success Message */}
                            {lastTxHash && (
                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="space-y-1">
                                            <p className="font-medium">✅ Operation Successful!</p>
                                            <p className="text-sm">
                                                TX: <span className="font-mono text-xs break-all">{lastTxHash}</span>
                                            </p>
                                            <div className="flex gap-2">
                                                <a
                                                    href={`https://arbiscan.io/tx/${lastTxHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-blue-600 hover:underline"
                                                >
                                                    Arbiscan →
                                                </a>
                                                <a
                                                    href={`https://explorer.hyperliquid.xyz/tx/${lastTxHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-green-600 hover:underline"
                                                >
                                                    HyperEVM →
                                                </a>
                                            </div>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}