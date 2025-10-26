import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, arbitrum, arbitrumSepolia } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Create a simple config with minimal setup
export const config = createConfig({
  chains: [arbitrum, arbitrumSepolia, sepolia, mainnet],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
    }),
  ],
  transports: {
    [arbitrum.id]: http(),
    [arbitrumSepolia.id]: http(),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})

// Export a function to get the config (useful for debugging)
export function getWagmiConfig() {
  return config
}
