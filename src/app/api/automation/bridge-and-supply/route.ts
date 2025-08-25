// src/app/api/automation/bridge-and-supply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { executeAutomatedBridgeAndSupply, checkAutomationAvailability } from '@/actions/automation'

interface BridgeAndSupplyRequest {
    subOrgId: string
    smartAccountAddress: string
    usdcAmount: string
    apiKey?: string // Optional API key for authentication
}

/**
 * POST /api/automation/bridge-and-supply
 * Execute automated bridge and supply operation
 */
export async function POST(request: NextRequest) {
    try {
        const body: BridgeAndSupplyRequest = await request.json()

        // Validate required fields
        if (!body.subOrgId || !body.smartAccountAddress || !body.usdcAmount) {
            return NextResponse.json(
                {
                    error: 'Missing required fields: subOrgId, smartAccountAddress, usdcAmount'
                },
                { status: 400 }
            )
        }

        // Optional: Add API key authentication
        // const apiKey = body.apiKey || request.headers.get('x-api-key')
        // if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
        //     return NextResponse.json(
        //         { error: 'Invalid or missing API key' },
        //         { status: 401 }
        //     )
        // }

        // Execute the automation
        const result = await executeAutomatedBridgeAndSupply(
            body.subOrgId,
            body.smartAccountAddress,
            body.usdcAmount
        )

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Bridge and supply completed successfully',
                data: {
                    bridgeTxHash: result.bridgeTxHash,
                    supplyTxHash: result.supplyTxHash,
                    approvalTxHash: result.approvalTxHash,
                    userBalance: result.userBalance,
                    smartAccountAddress: result.smartAccountAddress
                }
            })
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error,
                    userBalance: result.userBalance,
                    smartAccountAddress: result.smartAccountAddress
                },
                { status: 400 }
            )
        }

    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}

/**
 * GET /api/automation/bridge-and-supply?subOrgId=xxx&smartAccountAddress=xxx
 * Check automation availability and user balance
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const subOrgId = searchParams.get('subOrgId')
        const smartAccountAddress = searchParams.get('smartAccountAddress')

        if (!subOrgId || !smartAccountAddress) {
            return NextResponse.json(
                { error: 'Missing required query parameters: subOrgId, smartAccountAddress' },
                { status: 400 }
            )
        }

        const availability = await checkAutomationAvailability(subOrgId, smartAccountAddress)

        return NextResponse.json({
            available: availability.available,
            reason: availability.reason,
            currentBalance: availability.currentBalance,
            smartAccountAddress: availability.smartAccountAddress
        })

    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}