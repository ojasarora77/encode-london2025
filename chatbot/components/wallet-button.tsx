'use client'

import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

export function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connectAsync } = useConnect()
  const { disconnect } = useDisconnect()
  const [isLoading, setIsLoading] = useState(false)

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      await connectAsync({ connector: injected() })
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  if (isConnected && address) {
    return (
      <button
        onClick={handleDisconnect}
        className="px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 transform bg-transparent border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-black hover:scale-105 active:scale-95"
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 transform bg-transparent border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-black hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
