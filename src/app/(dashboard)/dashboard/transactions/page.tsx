"use client"

import { useEffect, useState } from "react"
import { TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { getTransactionsV2 } from "@/actions/api"
import { useUser } from "@/hooks/use-user"

// Import the V2 transaction types
interface TransactionV2Source {
    payment_rail: string
    description: string
    sender_name: string
    sender_bank_routing_number: string
    trace_number: string
}

interface TransactionV2 {
    amount: string
    timestamp: number
    type: string // "microdeposit" or "deposit"
    source?: TransactionV2Source // Only for microdeposit
    hash?: string // Only for deposit
    tokenName?: string // Only for deposit
    tokenSymbol?: string // Only for deposit
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<TransactionV2[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { user } = useUser()

    useEffect(() => {
        async function fetchTransactions() {
            if (!user?.organization?.organizationId) return

            try {
                setIsLoading(true)
                setError(null)
                const data = await getTransactionsV2(user.organization.organizationId)

                // Sort transactions by timestamp in descending order (newest first)
                const sortedData = data.sort((a, b) => b.timestamp - a.timestamp)

                setTransactions(sortedData)
            } catch (err) {
                console.error('Error fetching transactions:', err)
                setError('Failed to load transactions')
            } finally {
                setIsLoading(false)
            }
        }

        fetchTransactions()
    }, [user?.organization?.organizationId])

    // Check if any transactions are microdeposits to show/hide From column
    const hasMicrodeposits = transactions.some(tx => tx.type === 'microdeposit')

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatAmount = (amount: string) => {
        const numAmount = parseFloat(amount)
        const formatted = numAmount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
        return `$${formatted}`
    }

    const getTypeDisplay = (transaction: TransactionV2) => {
        if (transaction.type === 'microdeposit') {
            return 'Micro Deposit'
        }
        return 'Deposit'
    }

    const getFromDisplay = (transaction: TransactionV2) => {
        if (transaction.source) {
            return transaction.source.sender_name
        }
        return 'Blockchain'
    }

    const getDescriptionDisplay = (transaction: TransactionV2) => {
        if (transaction.source) {
            return transaction.source.description
        }
        if (transaction.hash) {
            return `Hash: ${transaction.hash.slice(0, 10)}...${transaction.hash.slice(-6)}`
        }
        return 'Blockchain transaction'
    }

    const getStatusBadge = (type: string) => {
        return (
            <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
            >
                Completed
            </Badge>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
            <div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {isLoading ? (
                        <div className="space-y-4 p-6">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 p-6">
                            <p className="text-red-500">{error}</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-8 p-6">
                            <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Get started by making your first deposit.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b border-gray-200">
                                            <TableHead className="font-semibold text-gray-700">
                                                Status
                                            </TableHead>
                                            <TableHead className="font-semibold text-gray-700">
                                                Date
                                            </TableHead>
                                            <TableHead className="font-semibold text-gray-700">
                                                Type
                                            </TableHead>
                                            {hasMicrodeposits && (
                                                <TableHead className="font-semibold text-gray-700">
                                                    From
                                                </TableHead>
                                            )}
                                            <TableHead className="font-semibold text-gray-700">
                                                Description
                                            </TableHead>
                                            <TableHead className="text-right font-semibold text-gray-700">
                                                Amount
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((transaction, index) => (
                                            <TableRow key={`${transaction.timestamp}-${index}`} className="border-b border-gray-100">
                                                <TableCell>
                                                    {getStatusBadge(transaction.type)}
                                                </TableCell>
                                                <TableCell className="text-gray-900">
                                                    <div>
                                                        <div>{formatDate(transaction.timestamp)}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {formatTime(transaction.timestamp)}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-900">
                                                    {getTypeDisplay(transaction)}
                                                </TableCell>
                                                {hasMicrodeposits && (
                                                    <TableCell className="text-gray-900">
                                                        {getFromDisplay(transaction)}
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-gray-600 max-w-xs truncate">
                                                    {getDescriptionDisplay(transaction)}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-gray-900">
                                                    {formatAmount(transaction.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-4 p-4">
                                {transactions.map((transaction, index) => (
                                    <div key={`${transaction.timestamp}-${index}`} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            {getStatusBadge(transaction.type)}
                                            <span className="text-sm font-semibold text-gray-900">
                                                {formatAmount(transaction.amount)}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Date</span>
                                                <span className="text-sm text-gray-900">
                                                    {formatDate(transaction.timestamp)} {formatTime(transaction.timestamp)}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Type</span>
                                                <span className="text-sm text-gray-900">
                                                    {getTypeDisplay(transaction)}
                                                </span>
                                            </div>

                                            {transaction.type === 'microdeposit' && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-500">From</span>
                                                    <span className="text-sm text-gray-900">
                                                        {getFromDisplay(transaction)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="pt-2 border-t border-gray-100">
                                                <p className="text-sm text-gray-600 truncate">
                                                    {getDescriptionDisplay(transaction)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}