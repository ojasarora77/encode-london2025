const { createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { arbitrumSepolia } = require('viem/chains');

// Test private key (same as in the app)
const TEST_PRIVATE_KEY = process.env.NEXT_PUBLIC_TEST_PRIVATE_KEY || '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

async function testPaymentFlow() {
  try {
    console.log('🧪 Testing payment flow...');
    
    // Create account and wallet client
    const account = privateKeyToAccount(TEST_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http()
    });
    
    console.log('📝 Account address:', account.address);
    
    // Generate signature for payment
    const paymentInfo = {
      amount: '0.01',
      currency: 'USDC',
      recipient: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 421614,
      nonce: Math.floor(Date.now() / 1000),
      deadline: Math.floor(Date.now() / 1000) + 3600
    };
    
    console.log('💰 Payment info:', paymentInfo);
    
    // EIP-712 domain and types
    const domain = {
      name: 'x402',
      version: '1',
      chainId: paymentInfo.chainId,
      verifyingContract: paymentInfo.recipient
    };
    
    const types = {
      PaymentAuthorization: [
        { name: 'amount', type: 'uint256' },
        { name: 'currency', type: 'string' },
        { name: 'recipient', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };
    
    // Convert amount to smallest unit (USDC has 6 decimals)
    const amountInUnits = Math.floor(parseFloat(paymentInfo.amount) * 1_000_000);
    
    const message = {
      amount: BigInt(amountInUnits),
      currency: paymentInfo.currency,
      recipient: paymentInfo.recipient,
      nonce: BigInt(paymentInfo.nonce),
      deadline: BigInt(paymentInfo.deadline)
    };
    
    console.log('✍️ Signing payment authorization...');
    const signature = await walletClient.signTypedData({
      account,
      domain,
      types,
      primaryType: 'PaymentAuthorization',
      message
    });
    
    console.log('✅ Signature generated:', signature.slice(0, 20) + '...');
    
    // Test the API call with signature
    console.log('🔄 Testing API call with signature...');
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'find me an agent that is good at coding' }
        ],
        id: 'test',
        previewToken: null,
        x402Signature: signature
      })
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ Payment processed successfully!');
      const text = await response.text();
      console.log('📄 Response preview:', text.slice(0, 200) + '...');
    } else {
      console.log('❌ Request failed');
      const error = await response.text();
      console.log('Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPaymentFlow();
