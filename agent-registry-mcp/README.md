# Agent Registry MCP Server with x402 Payments

A Model Context Protocol (MCP) server that provides **paid** semantic search capabilities for the Agent Registry using **x402** payment protocol and Cloudflare Workers.

## Features

- **💰 x402 Payments**: Pay-per-use semantic agent search using cryptocurrency
- **🔍 Semantic Search**: Find agents using natural language queries
- **🎯 Metadata Filtering**: Filter by capabilities, input/output modes, and similarity scores
- **📊 High Accuracy**: 85-90% accuracy using Venice AI embeddings and Pinecone vector search
- **⚡ Serverless**: Cloudflare Workers deployment with global edge distribution
- **🔐 Secure Wallets**: Server-managed wallets via Coinbase CDP

## x402 Payment Protocol

This MCP server uses [x402](https://x402.org), a protocol built on top of HTTP for doing fully accountless payments easily, quickly, cheaply and securely.

### Pricing

- **Basic Search**: $0.001 per query (0.1 cents)
- All searches are paid via USDC on Base blockchain
- Instant, accountless payments - no registration required

### How It Works

1. **Client Request**: MCP client calls the `search_agents` tool
2. **Payment Required**: Server responds with x402 payment request
3. **Payment Processing**: Client pays $0.001 in USDC automatically
4. **Search Execution**: Server processes search and returns results
5. **On-Chain Record**: Payment transaction recorded on Base blockchain

## MCP Tool

### `search_agents` (Paid Tool - $0.001)

Search the agent registry to find agents with specific capabilities.

**Parameters:**
- `query` (string, required): Natural language description of needed capability
- `limit` (integer, optional): Number of results to return (1-10, default: 5)
- `filters` (object, optional): Additional filters to narrow results
  - `capabilities` (array): Filter by agent capabilities
  - `inputMode` (string): Filter by input mode
  - `outputMode` (string): Filter by output mode
  - `minScore` (number): Minimum similarity score (0.0-1.0)

**Example Usage:**
```json
{
  "query": "I need to extract invoice data from PDF files",
  "limit": 3,
  "filters": {
    "capabilities": ["streaming", "ocr"],
    "minScore": 0.7
  }
}
```

## Setup

### Prerequisites
- Node.js 18+
- Coinbase CDP account ([sign up here](https://portal.cdp.coinbase.com))
- Agent Registry API running

### 1. Get Coinbase CDP Credentials

1. Sign up at [Coinbase CDP Portal](https://portal.cdp.coinbase.com)
2. Create API credentials:
   - Go to **API Keys** section
   - Create new API key
   - Save `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET`
3. Create wallet secret:
   - Generate a secure random string (32+ characters)
   - This will be your `CDP_WALLET_SECRET`

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the environment template:
```bash
cp env.example .env
```

Edit `.env` with your credentials:
```env
CDP_API_KEY_ID=your_actual_api_key_id
CDP_API_KEY_SECRET=your_actual_api_key_secret
CDP_WALLET_SECRET=your_secure_wallet_secret
NETWORK=base-sepolia
AGENT_REGISTRY_URL=http://localhost:3001
```

### 4. Run Locally

```bash
npm run dev
```

The server will:
- Create a seller account automatically
- Request testnet USDC if balance is low (on base-sepolia)
- Start accepting paid search requests

## Testing with Testnet

By default, the server uses `base-sepolia` (testnet) with fake money:

1. **Automatic Funding**: Server automatically requests testnet USDC from faucet
2. **Free Testing**: All transactions use fake money
3. **View Transactions**: Check [Base Sepolia Explorer](https://sepolia.basescan.org)

### Manual Faucet Request

If you need more testnet funds:
1. Go to [Coinbase CDP Faucet](https://portal.cdp.coinbase.com/products/faucet)
2. Select **Base Sepolia** network
3. Request **USDC** tokens
4. Enter your seller account address

## Production Deployment

### 1. Switch to Mainnet

Update `.env`:
```env
NETWORK=base
```

**⚠️ Important**: On mainnet, you'll need real USDC. Fund your seller account before deploying.

### 2. Deploy to Cloudflare Workers

```bash
npm run deploy
```

### 3. Fund Seller Account

1. Go to [CDP Dashboard](https://portal.cdp.coinbase.com/products/server-wallet)
2. Find your `AgentRegistryMCP-Seller` account
3. Send USDC to the account address
4. Minimum recommended: $10 USDC for operations

## Architecture

```
MCP Client (with x402 support)
    ↓
    ↓ (1) Tool Call: search_agents
    ↓
Agent Registry MCP Server
    ↓
    ↓ (2) Payment Request: $0.001 USDC
    ↓
MCP Client
    ↓
    ↓ (3) Payment: USDC transfer
    ↓
Agent Registry MCP Server
    ↓
    ↓ (4) Search Request
    ↓
Agent Registry API (Venice AI + Pinecone)
    ↓
    ↓ (5) Search Results
    ↓
MCP Client
```

## Example Results

```json
{
  "query": "extract invoice data from PDF",
  "results": [
    {
      "rank": 1,
      "agentId": "invoice-extract-001",
      "name": "Invoice Extraction Agent",
      "description": "Extracts relevant fields from uploaded invoices...",
      "url": "https://agents.example.com/invoice-extraction",
      "score": 0.691,
      "capabilities": ["streaming", "batch-processing"],
      "matchReasons": ["Moderate semantic match"]
    }
  ],
  "total": 1,
  "timestamp": "2025-10-25T00:15:00.000Z"
}
```

## MCP Client Integration

To use this paid MCP server, your client must support x402 payments:

```javascript
import { withPayment } from 'x402-mcp';
import { createMCPClient } from 'ai';

const client = await createMCPClient({
  transport: new StreamableHTTPClientTransport(
    new URL('https://your-mcp-server.workers.dev')
  )
}).then((client) => withPayment(client, { 
  account: purchaserAccount, 
  network: 'base-sepolia' 
}));

// Use the paid tool
const result = await client.callTool('search_agents', {
  query: 'translate text between languages',
  limit: 3
});
```

## Monitoring

### Check Seller Account Balance

```javascript
import { CdpClient } from '@coinbase/cdp-sdk';

const cdp = new CdpClient();
const account = await cdp.evm.getOrCreateAccount({
  name: 'AgentRegistryMCP-Seller'
});

const balances = await account.listTokenBalances({
  network: 'base-sepolia'
});

console.log(balances);
```

### View Transactions

- **Testnet**: https://sepolia.basescan.org/address/YOUR_SELLER_ADDRESS
- **Mainnet**: https://basescan.org/address/YOUR_SELLER_ADDRESS

## Troubleshooting

### "Missing required environment variable"
- Ensure all CDP credentials are set in `.env`
- Check that `.env` file exists and is loaded

### "Failed to receive funds from faucet"
- Faucet may be rate-limited
- Try manual faucet request from CDP dashboard
- Wait a few minutes and retry

### "Agent registry API error: 500"
- Ensure Agent Registry API is running on port 3001
- Check `AGENT_REGISTRY_URL` in `.env`
- Test API directly: `curl http://localhost:3001/api/health`

### Payment Not Processing
- Verify purchaser account has sufficient USDC balance
- Check network matches (both client and server on same network)
- View transaction on blockchain explorer

## Cost Analysis

### Per Search Costs:
- **Venice AI Embedding**: ~$0.0001
- **Pinecone Vector Search**: Included in subscription
- **x402 Transaction**: ~$0.0001 (gas fees)
- **Total Cost**: ~$0.0002 per search

### Revenue:
- **Price**: $0.001 per search
- **Profit Margin**: ~80% ($0.0008 per search)

### Example Revenue:
- **1,000 searches/month**: $1.00 revenue, $0.80 profit
- **10,000 searches/month**: $10.00 revenue, $8.00 profit
- **100,000 searches/month**: $100.00 revenue, $80.00 profit

## Security

- **Server-Managed Wallets**: CDP handles wallet security
- **No Private Keys**: Never expose private keys
- **Automatic Encryption**: Wallets encrypted with `CDP_WALLET_SECRET`
- **On-Chain Transparency**: All transactions visible on blockchain

## License

MIT

## Support

- **x402 Protocol**: https://x402.org
- **Coinbase CDP**: https://docs.cdp.coinbase.com
- **Agent Registry**: See `/agent-registry/README.md`
- **MCP Protocol**: https://modelcontextprotocol.io

## Related Projects

- **Agent Registry**: Semantic agent search with Venice AI + Pinecone
- **x402**: HTTP payment protocol for accountless transactions
- **Coinbase CDP**: Server-managed cryptocurrency wallets