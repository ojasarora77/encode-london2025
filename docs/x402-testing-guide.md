# x402 Payment Integration - Ready to Test! 🚀

## Current Setup

### Services Running:
1. **Chatbot**: http://localhost:3000
2. **MCP Worker** (with x402): http://localhost:8787
3. **MCP Express** (no payments): http://localhost:3002

### Configuration:
- Chatbot is now connected to the **Worker** at port 8787
- Worker has full x402 payment implementation
- Frontend has wallet connection + EIP-712 signing

## How to Test the Full Payment Flow

### 1. Open the Chatbot
Navigate to: http://localhost:3000

### 2. Trigger Agent Search
Type any query that includes keywords like:
- "find flights to Ibiza"
- "search for agents"
- "find pdf parsing agents"

### 3. Expected Flow:

```
User Query → Chatbot detects keyword
    ↓
Chatbot calls Worker without signature
    ↓
Worker returns 402 Payment Required ✅
    ↓
Payment Dialog Opens 💰
    ↓
Click "Connect Wallet & Pay"
    ↓
MetaMask prompts for connection
    ↓
User approves wallet connection
    ↓
MetaMask prompts for EIP-712 signature
    ↓
User signs payment authorization
    ↓
Chatbot retries with signature
    ↓
Worker verifies signature → Executes USDC transfer → Returns results
    ↓
Venice AI formats the agent search results ✨
```

## Test Data Confirmed:

From the worker's 402 response:
```json
{
  "payment": {
    "amount": "0.01",
    "currency": "USDC",
    "network": "arbitrum-sepolia",
    "recipient": "0x1234567890abcdef1234567890abcdef12345678",
    "description": "Agent Registry Search - $0.01 USDC"
  }
}
```

## What's Integrated:

### Backend (Worker - index-integrated.js):
- ✅ 402 Payment Required response
- ✅ EIP-712 signature verification
- ✅ USDC transfer execution via relayer
- ✅ Payment metadata in responses
- ✅ Agent search with Pinecone + Venice embeddings

### Frontend (Chatbot):
- ✅ 402 response detection
- ✅ Payment dialog UI
- ✅ Wallet connection (MetaMask)
- ✅ EIP-712 signature generation
- ✅ Request retry with signature
- ✅ Payment confirmation toasts

## Important Notes:

1. **Wallet Setup**: Make sure MetaMask is:
   - Installed in your browser
   - Connected to Arbitrum Sepolia testnet
   - Has some test USDC (if you want to complete the transfer)

2. **Test Without Real Payments**: The signature generation and flow will work even without USDC. The actual on-chain transfer might fail, but you'll see the full UX flow.

3. **Worker vs Express Server**:
   - Worker (8787): Has x402 payments ✅
   - Express (3002): No payments, for basic testing

## Next Steps:

1. Test the flow in browser
2. Check browser console for payment logs
3. Verify MetaMask prompts appear correctly
4. Confirm signature is sent back to worker
5. Check worker logs for signature verification

## Debugging:

If payment dialog doesn't appear:
- Check browser console for errors
- Verify chatbot is connected to port 8787 (not 3002)
- Check Network tab for 402 response
- Ensure keyword detection is working

If wallet doesn't connect:
- Check MetaMask is installed
- Try refreshing the page
- Check browser console for wallet errors

---

Ready to test! Open http://localhost:3000 and try "find flights to Ibiza" 🎉
