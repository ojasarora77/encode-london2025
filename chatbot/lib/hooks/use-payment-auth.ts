'use client'

import { useState, useCallback } from 'react'
import { createWalletClient, http, type WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia } from 'viem/chains'

export interface PaymentInfo {
  amount: string
  currency: string
  recipient: string
  chainId?: number
  nonce?: number
  deadline?: number
  network?: string
  description?: string
}

// Use a local test private key (for development only!)
const TEST_PRIVATE_KEY = process.env.NEXT_PUBLIC_TEST_PRIVATE_KEY

export function usePaymentAuth() {
  const [isConnecting, setIsConnecting] = useState(false)
  
  // Create account from private key
  const account = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`)
  const address = account.address

  // Create wallet client
  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http()
  })

  const connectWallet = useCallback(async () => {
    // No need to connect - we're using a local private key
    console.log('Using local wallet:', address)
    return address
  }, [address])

  const generateSignature = useCallback(
    async (paymentInfo: PaymentInfo): Promise<string> => {
      setIsConnecting(true)
      try {
        console.log('Payment info received:', paymentInfo)

        // EIP-712 domain
        const domain = {
          name: 'x402',
          version: '1',
          chainId: paymentInfo.chainId || 421614, // Default to Arbitrum Sepolia
          verifyingContract: paymentInfo.recipient as `0x${string}`
        } as const

        // EIP-712 types
        const types = {
          PaymentAuthorization: [
            { name: 'amount', type: 'uint256' },
            { name: 'currency', type: 'string' },
            { name: 'recipient', type: 'address' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
          ]
        } as const

        // Convert amount to smallest unit (USDC has 6 decimals)
        // 0.01 USDC = 10000 units
        const amountInUnits = Math.floor(
          parseFloat(paymentInfo.amount) * 1_000_000
        )

        // Generate nonce and deadline if not provided
        const nonce = paymentInfo.nonce || Math.floor(Date.now() / 1000)
        const deadline = paymentInfo.deadline || Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

        // Message to sign
        const message = {
          amount: BigInt(amountInUnits),
          currency: paymentInfo.currency,
          recipient: paymentInfo.recipient as `0x${string}`,
          nonce: BigInt(nonce),
          deadline: BigInt(deadline)
        } as const

        console.log('Signing payment authorization:', {
          domain,
          message,
          signer: address
        })

        // Sign typed data
        const signature = await walletClient.signTypedData({
          account,
          domain,
          types,
          primaryType: 'PaymentAuthorization',
          message
        })

        console.log('Payment signature generated:', signature)
        return signature
      } catch (error) {
        console.error('Failed to sign payment:', error)
        throw error
      } finally {
        setIsConnecting(false)
      }
    },
    [walletClient, account, address]
  )

  const disconnect = useCallback(() => {
    // No need to disconnect - local key
  }, [])

  return {
    walletClient,
    address,
    isConnecting,
    connectWallet,
    generateSignature,
    disconnect
  }
}
