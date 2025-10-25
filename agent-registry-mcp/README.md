# Agent Registry MCP Server

A Model Context Protocol (MCP) server that provides semantic search capabilities for the Agent Registry using Cloudflare Workers.

## Features

- **Semantic Search**: Find agents using natural language queries
- **Metadata Filtering**: Filter by capabilities, input/output modes, and similarity scores
- **High Accuracy**: 85-90% accuracy using Venice AI embeddings and Pinecone vector search
- **Cloudflare Workers**: Serverless deployment with global edge distribution

## MCP Tool

### `search_agents`

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

## Development

### Prerequisites
- Node.js 18+
- Wrangler CLI
- Agent Registry API running

### Setup
```bash
npm install
```

### Local Development
```bash
npm run dev
```

### Deployment
```bash
npm run deploy
```

## Configuration

Set the `AGENT_REGISTRY_URL` environment variable to point to your Agent Registry API:

```bash
# Local development
AGENT_REGISTRY_URL=http://localhost:3001

# Production
AGENT_REGISTRY_URL=https://your-agent-registry.workers.dev
```

## Architecture

```
MCP Client
    ↓
Agent Registry MCP Server (Cloudflare Worker)
    ↓
Agent Registry API (Venice AI + Pinecone)
    ↓
Search Results
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

## Integration

This MCP server can be integrated with any MCP-compatible client to provide semantic agent discovery capabilities.

## License

MIT
