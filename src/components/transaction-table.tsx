"use client"

import { useState } from "react"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface Transaction {
    id: string
    type: string
    currency: string
    date: string
    time: string
    amount: number
    status: "Completed" | "Pending" | "Failed"
}

interface TransactionTableProps {
    transactions?: Transaction[]
}

const defaultTransactions: Transaction[] = [
    {
        id: "1",
        type: "Deposit",
        currency: "USD",
        date: "15 June 2025",
        time: "10:30 AM",
        amount: 250.00,
        status: "Completed"
    },
    {
        id: "2",
        type: "Deposit",
        currency: "USD",
        date: "1 June 2025",
        time: "1:15 PM",
        amount: 250.00,
        status: "Completed"
    },
    {
        id: "3",
        type: "Deposit",
        currency: "USD",
        date: "15 May 2025",
        time: "11:00 AM",
        amount: 250.00,
        status: "Completed"
    },
    {
        id: "4",
        type: "Deposit",
        currency: "USD",
        date: "1 May 2025",
        time: "2:30 PM",
        amount: 250.00,
        status: "Completed"
    }
]

export default function TransactionTable({ transactions = defaultTransactions }: TransactionTableProps) {
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

    const handleSort = () => {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
        // In a real app, you would implement actual sorting logic here
    }

    const getStatusColor = (status: Transaction["status"]) => {
        switch (status) {
            case "Completed":
                return "bg-blue-100 text-blue-800 border-blue-200"
            case "Pending":
                return "bg-yellow-100 text-yellow-800 border-yellow-200"
            case "Failed":
                return "bg-red-100 text-red-800 border-red-200"
            default:
                return "bg-gray-100 text-gray-800 border-gray-200"
        }
    }

    return (
        <div className="rounded-lg border bg-white shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="border-b border-gray-200">
                        <TableHead className="text-left font-semibold text-gray-700">
                            <Button
                                variant="ghost"
                                onClick={handleSort}
                                className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
                            >
                                Transaction
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="text-left font-semibold text-gray-700">
                            Date
                        </TableHead>
                        <TableHead className="text-right font-semibold text-gray-700">
                            Amount
                        </TableHead>
                        <TableHead className="text-center font-semibold text-gray-700">
                            Status
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((transaction) => (
                        <TableRow key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <TableCell className="py-4">
                                <div>
                                    <div className="font-semibold text-gray-900">
                                        {transaction.type}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {transaction.currency}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="py-4">
                                <div>
                                    <div className="font-medium text-gray-900">
                                        {transaction.date}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {transaction.time}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="py-4 text-right">
                                <div className="font-semibold text-gray-900">
                                    ${transaction.amount.toFixed(2)}
                                </div>
                            </TableCell>
                            <TableCell className="py-4 text-center">
                                <Badge
                                    variant="outline"
                                    className={`font-medium ${getStatusColor(transaction.status)}`}
                                >
                                    {transaction.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="py-4">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>View Details</DropdownMenuItem>
                                        <DropdownMenuItem>Download Receipt</DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600">
                                            Report Issue
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}