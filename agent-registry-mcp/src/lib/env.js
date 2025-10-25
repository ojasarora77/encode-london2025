export function getEnv(env) {
  const config = {
    CDP_WALLET_SECRET: env.CDP_WALLET_SECRET,
    CDP_API_KEY_ID: env.CDP_API_KEY_ID,
    CDP_API_KEY_SECRET: env.CDP_API_KEY_SECRET,
    NETWORK: env.NETWORK || 'base-sepolia',
    AGENT_REGISTRY_URL: env.AGENT_REGISTRY_URL || 'http://localhost:3001'
  };

  // Validate required environment variables
  const requiredEnvVars = [
    'CDP_WALLET_SECRET',
    'CDP_API_KEY_ID',
    'CDP_API_KEY_SECRET'
  ];

  for (const envVar of requiredEnvVars) {
    if (!config[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return config;
}

