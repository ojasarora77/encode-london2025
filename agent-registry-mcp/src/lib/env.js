export function getEnv(env) {
  const config = {
    // x402 Payment Configuration
    NETWORK: env.NETWORK || 'arbitrum-sepolia',
    PURCHASER_PRIVATE_KEY: env.PURCHASER_PRIVATE_KEY,
    SELLER_ADDRESS: env.SELLER_ADDRESS,
    
    // ERC8004 Blockchain Integration
    ARBITRUM_SEPOLIA_RPC_URL: env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    REPUTATION_REGISTRY_ADDRESS: env.REPUTATION_REGISTRY_ADDRESS || '0x3d19BBb10FD29884eEc897d0D7e865ceC7471594',
    IDENTITY_REGISTRY_ADDRESS: env.IDENTITY_REGISTRY_ADDRESS || '0x37D83087db34570EC261b55344380A4FC5e45387',
    PRIVATE_KEY: env.PRIVATE_KEY,
    FEEDBACK_PRIVATE_KEY: env.FEEDBACK_PRIVATE_KEY,
    ARBISCAN_API_KEY: env.ARBISCAN_API_KEY,
    
    // Agent Registry Direct Integration
    VENICE_API_KEY: env.VENICE_API_KEY,
    PINECONE_API_KEY: env.PINECONE_API_KEY,
    PINECONE_ENVIRONMENT: env.PINECONE_ENVIRONMENT,
    PINECONE_INDEX_NAME: env.PINECONE_INDEX_NAME,
    
    // Optional: CDP Configuration
    CDP_WALLET_SECRET: env.CDP_WALLET_SECRET,
    CDP_API_KEY_ID: env.CDP_API_KEY_ID,
    CDP_API_KEY_SECRET: env.CDP_API_KEY_SECRET,
  };

  // Validate required environment variables
  const requiredEnvVars = [
    'VENICE_API_KEY',
    'PINECONE_API_KEY',
    'PINECONE_ENVIRONMENT',
    'PINECONE_INDEX_NAME'
  ];

  for (const envVar of requiredEnvVars) {
    if (!config[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return config;
}

