import { toAccount } from 'viem/accounts';
import { CdpClient } from '@coinbase/cdp-sdk';
import { base, baseSepolia } from 'viem/chains';
import { createPublicClient, http } from 'viem';

const cdp = new CdpClient();

const chainMap = {
  'base-sepolia': baseSepolia,
  'base': base,
};

export async function getOrCreateSellerAccount(env) {
  const chain = chainMap[env.NETWORK];
  
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });
  const account = await cdp.evm.getOrCreateAccount({
    name: 'AgentRegistryMCP-Seller',
  });
  
  const balances = await account.listTokenBalances({
    network: env.NETWORK,
  });

  const usdcBalance = balances.balances.find(
    (balance) => balance.token.symbol === 'USDC'
  );

  // If under $0.50 while on testnet, request more
  if (
    env.NETWORK === 'base-sepolia' &&
    (!usdcBalance || Number(usdcBalance.amount) < 500000)
  ) {
    console.log('Requesting testnet USDC from faucet...');
    const { transactionHash } = await cdp.evm.requestFaucet({
      address: account.address,
      network: env.NETWORK,
      token: 'usdc',
    });
    const tx = await publicClient.waitForTransactionReceipt({
      hash: transactionHash,
    });
    if (tx.status !== 'success') {
      throw new Error('Failed to receive funds from faucet');
    }
    console.log('Received testnet USDC successfully');
  }

  return toAccount(account);
}

