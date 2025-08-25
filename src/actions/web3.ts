"use server"

import { Alchemy, AssetTransfersCategory, Network } from "alchemy-sdk"
import {Address, createWalletClient, http, getAddress, parseEther, hexToBytes} from 'viem'

import { env } from "@/env.mjs"
import type { Transaction } from "@/types/web3"
import {privateKeyToAccount} from 'viem/accounts'
import {arbitrum} from 'viem/chains'

const settings = {
  apiKey: env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.ETH_SEPOLIA,
  // https://github.com/alchemyplatform/alchemy-sdk-js/issues/400
  connectionInfoOverrides: {
    skipFetchSetup: true,
  },
}

const alchemy = new Alchemy(settings)

export const getBalance = async (address: Address) => {
  let response = await alchemy.core.getBalance(address, "latest")
  const balanceBigInt = BigInt(response.toString())
  return balanceBigInt
}

export const getTokenBalance = async (address: Address) => {
  const tokenBalances = await alchemy.core.getTokenBalances(address)
  return tokenBalances
}

export const getTransactions = async (
  address: Address
): Promise<Record<string, Transaction[]>> => {
  // Fetch sent and received transactions concurrently
  const [sentResponse, receivedResponse] = await Promise.all([
    alchemy.core.getAssetTransfers({
      fromAddress: address,
      excludeZeroValue: false,
      category: [
        AssetTransfersCategory.ERC20,
        AssetTransfersCategory.EXTERNAL,
        AssetTransfersCategory.INTERNAL,
      ],
      withMetadata: true,
    }),
    alchemy.core.getAssetTransfers({
      toAddress: address,
      excludeZeroValue: false,
      category: [
        AssetTransfersCategory.ERC20,
        AssetTransfersCategory.EXTERNAL,
        AssetTransfersCategory.INTERNAL,
      ],
      withMetadata: true,
    }),
  ])

  // Map the responses
  const sentTransactions = [
    ...sentResponse.transfers.map(
      ({ blockNum, from, to, hash, value, metadata }) => ({
        blockNumber: Number(blockNum),
        from: getAddress(from),
        to: to ? getAddress(to) : null,
        hash,
        value: value ? parseEther(value.toString()) : null,
        status: "sent" as const,
        timestamp: metadata.blockTimestamp,
      })
    ),
  ]
  const receivedTransactions = [
    ...receivedResponse.transfers.map(
      ({ blockNum, from, to, hash, value, metadata }) => ({
        blockNumber: Number(blockNum),
        from: getAddress(from),
        to: to ? getAddress(to) : null,
        hash,
        value: value ? parseEther(value.toString()) : null,
        status: "received" as const,
        timestamp: metadata.blockTimestamp,
      })
    ),
  ]

  // Sort transactions by block number in descending order
  sentTransactions.sort((a, b) => b.blockNumber - a.blockNumber)
  receivedTransactions.sort((a, b) => b.blockNumber - a.blockNumber)

  return {
    sentTransactions,
    receivedTransactions,
  }
}

type TokenPriceResponse<T extends string> = {
  [key in T]: {
    usd: number
  }
}

export const getTokenPrice = async <T extends string>(
  token: T
): Promise<number> => {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-cg-demo-api-key": env.COINGECKO_API_KEY,
    },
  })
  const data: TokenPriceResponse<T> = await response.json()

  return data[token].usd
}

export async function fundEthArb(smartAccountAddress: `0x${string}`, amount?: string) {
  // Await the async function to get the actual private key
  const {getEthArbFunderPrivateKey} = await import('@/lib/sst-resources')
  const funderPrivateKey = await getEthArbFunderPrivateKey() as `0x${string}`
  if (!funderPrivateKey) throw new Error("ETH_ARB_FUNDER_PRIVATE_KEY not set")

  console.log('funderPrivateKey length:', funderPrivateKey.length)
  console.log('funderPrivateKey starts with 0x:', funderPrivateKey.startsWith('0x'))

  if (!funderPrivateKey || funderPrivateKey.length !== 66) {
    throw new Error(`Invalid ETH_FUNDER_PRIVATE_KEY: length ${funderPrivateKey.length}, expected 66`)
  }

  const funder = privateKeyToAccount(funderPrivateKey)

  const client = createWalletClient({
    account: funder,
    chain: arbitrum,
    transport: http()
  })

  const hash = await client.sendTransaction({
    to: smartAccountAddress,
    value: parseEther(amount ? amount : "0.00025"), // ~ $2 at $3,500/ETH
  })

  console.log(`✅ Funded ETH to ${smartAccountAddress}: ${hash}`)
  return hash
}