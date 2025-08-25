// src/app/api/debug/session-key/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { debugSessionKey, testSessionKey, fixSessionKeyIssues } from '@/lib/session-key-debug'
import {
    debugSessionKeyDeserialization,
    testDeserializationConsistency
} from '@/lib/session-key-deserialization-debug'

/**
 * GET /api/debug/session-key?subOrgId=xxx&smartAccountAddress=xxx&action=diagnose
 * Debug session key issues
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const subOrgId = searchParams.get('subOrgId')
        const smartAccountAddress = searchParams.get('smartAccountAddress')
        const action = searchParams.get('action') || 'diagnose'
        const attempts = parseInt(searchParams.get('attempts') || '5')

        if (!subOrgId || !smartAccountAddress) {
            return NextResponse.json(
                { error: 'Missing required parameters: subOrgId, smartAccountAddress' },
                { status: 400 }
            )
        }

        let result

        switch (action) {
            case 'diagnose':
                result = await debugSessionKey(subOrgId, smartAccountAddress)
                break

            case 'test':
                result = await testSessionKey(subOrgId, smartAccountAddress)
                break

            case 'fix':
                result = await fixSessionKeyIssues(subOrgId, smartAccountAddress)
                break

            case 'deserialize':
                result = await debugSessionKeyDeserialization(subOrgId, smartAccountAddress)
                break

            case 'consistency':
                result = await testDeserializationConsistency(subOrgId, smartAccountAddress, attempts)
                break

            default:
                return NextResponse.json(
                    { error: 'Invalid action. Use: diagnose, test, fix, deserialize, or consistency' },
                    { status: 400 }
                )
        }

        return NextResponse.json({
            action,
            subOrgId,
            smartAccountAddress,
            result,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('Session key debug error:', error)
        return NextResponse.json(
            {
                error: 'Debug failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}

/**
 * POST /api/debug/session-key
 * Batch debug multiple users or perform advanced operations
 */
export async function POST(request: NextRequest) {
    try {
        const { users, action = 'diagnose', attempts = 5 } = await request.json()

        if (!Array.isArray(users) || users.length === 0) {
            return NextResponse.json(
                { error: 'Users array is required' },
                { status: 400 }
            )
        }

        const results = []

        for (const user of users) {
            if (!user.subOrgId || !user.smartAccountAddress) {
                results.push({
                    ...user,
                    error: 'Missing subOrgId or smartAccountAddress'
                })
                continue
            }

            try {
                let result

                switch (action) {
                    case 'diagnose':
                        result = await debugSessionKey(user.subOrgId, user.smartAccountAddress)
                        break

                    case 'test':
                        result = await testSessionKey(user.subOrgId, user.smartAccountAddress)
                        break

                    case 'fix':
                        result = await fixSessionKeyIssues(user.subOrgId, user.smartAccountAddress)
                        break

                    case 'deserialize':
                        result = await debugSessionKeyDeserialization(user.subOrgId, user.smartAccountAddress)
                        break

                    case 'consistency':
                        result = await testDeserializationConsistency(user.subOrgId, user.smartAccountAddress, attempts)
                        break

                    default:
                        result = { error: 'Invalid action' }
                }

                results.push({
                    ...user,
                    result
                })

            } catch (userError) {
                results.push({
                    ...user,
                    error: userError instanceof Error ? userError.message : 'Unknown error'
                })
            }
        }

        return NextResponse.json({
            action,
            totalUsers: users.length,
            results,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('Batch session key debug error:', error)
        return NextResponse.json(
            {
                error: 'Batch debug failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}