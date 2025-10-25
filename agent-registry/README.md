# Agent Registry Vector Search

A cloud-based agent discovery system using vector embeddings for semantic search. Agents can search for other agents with specific capabilities using natural language queries.

## Architecture

```
Agent Query → Venice AI Embedding → Pinecone Vector Search → Top N Agents
                                    ↓
                            Metadata Filters Applied
```

## Tech Stack

- **Embeddings:** Venice AI (text-embedding-bge-m3, 1024 dimensions)
- **Vector Database:** Pinecone (cloud-managed)
- **Language:** TypeScript/Node.js
- **API:** Express.js
- **Search Method:** Hybrid (vector + metadata filters)

## Features

- 🔍 **Semantic Search:** Find agents using natural language queries
- 🎯 **Metadata Filtering:** Filter by capabilities, input/output modes
- 📊 **Batch Processing:** Efficient bulk indexing of agents
- 🚀 **Real-time Search:** Fast vector similarity search
- 🔧 **RESTful API:** Easy integration with other systems

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the environment template and fill in your API keys:

```bash
cp env.example .env
```

Edit `.env` with your credentials:

```env
# Venice AI Configuration
VENICE_API_KEY=your_venice_api_key_here

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=agent-registry

# Server Configuration
PORT=3001
```

### 3. Index Sample Agents

```bash
npm run index-agents
```

This will:
- Initialize the Pinecone index
- Load 15 sample agents
- Generate embeddings using Venice AI
- Index agents in Pinecone
- Run test searches to verify functionality

### 4. Start the API Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health Check

```bash
GET /api/health
```

Returns server status and timestamp.

### Search Agents

```bash
POST /api/agents/search
```

**Request Body:**
```json
{
  "query": "extract invoice data from PDF",
  "limit": 5,
  "filters": {
    "capabilities": ["streaming", "ocr"],
    "inputMode": "application/pdf",
    "minScore": 0.7
  }
}
```

**Response:**
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
      "score": 0.94,
      "capabilities": ["streaming", "batch-processing"],
      "matchReasons": [
        "Excellent semantic match",
        "Capabilities: streaming, batch-processing"
      ]
    }
  ],
  "total": 1,
  "timestamp": "2025-01-25T00:15:00.000Z"
}
```

## Usage Examples

### Basic Search

```bash
curl -X POST http://localhost:3001/api/agents/search \
  -H "Content-Type: application/json" \
  -d '{"query": "translate text between languages", "limit": 3}'
```

### Filtered Search

```bash
curl -X POST http://localhost:3001/api/agents/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "analyze code quality",
    "limit": 5,
    "filters": {
      "capabilities": ["streaming"],
      "minScore": 0.8
    }
  }'
```

### Programmatic Usage

```typescript
import { indexerService } from './src/index';

// Search for agents
const results = await indexerService.searchAgents(
  'I need to extract invoice data from PDF files',
  5,
  {
    capabilities: ['streaming'],
    inputMode: 'application/pdf',
    minScore: 0.7
  }
);

console.log(results);
```

## Sample Agents

The system comes with 15 diverse sample agents:

- **Invoice Extraction Agent** - PDF invoice processing
- **Document Parser Pro** - General document processing
- **Multi-Language Translator** - 50+ language translation
- **Smart Image Analyzer** - Computer vision and OCR
- **AI Code Reviewer** - Automated code analysis
- **Customer Support Agent** - AI-powered support
- **Financial Data Analyzer** - Financial insights
- **Email Classification Agent** - Email categorization
- **Web Data Extractor** - Web scraping and parsing
- **Voice Transcription Agent** - Speech to text
- **AI Content Generator** - Content creation
- **Meeting Analysis Agent** - Meeting insights
- **Quality Assurance Agent** - Automated testing
- **Recommendation Engine** - Personalized recommendations
- **Fraud Detection Agent** - Security and fraud detection

## Project Structure

```
agent-registry/
├── src/
│   ├── types/
│   │   └── agentcard.types.ts     # TypeScript interfaces
│   ├── services/
│   │   ├── embedding.service.ts   # Venice AI integration
│   │   ├── vector.service.ts      # Pinecone operations
│   │   └── indexer.service.ts     # Agent indexing logic
│   ├── api/
│   │   └── server.ts             # Express API server
│   └── index.ts                  # Main entry point
├── scripts/
│   └── index-agents.ts           # Bulk indexing script
├── data/
│   └── sample-agents.json        # Sample agent data
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run index-agents` - Index sample agents
- `npm run typecheck` - TypeScript validation

### Adding New Agents

1. Add agent data to `data/sample-agents.json`
2. Run `npm run index-agents` to re-index
3. Test with search queries

### Custom Agent Format

```typescript
interface AgentCard {
  id: string;
  name: string;
  description: string;
  url: string;
  version?: string;
  provider?: string;
  capabilities?: string[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  skills?: Skill[];
}
```

## Configuration

### Venice AI Setup

1. Sign up at [Venice AI](https://venice.ai)
2. Get your API key
3. Add to `.env` as `VENICE_API_KEY`

### Pinecone Setup

1. Sign up at [Pinecone](https://pinecone.io)
2. Create a new project
3. Get your API key and environment
4. Add to `.env`:
   - `PINECONE_API_KEY`
   - `PINECONE_ENVIRONMENT`
   - `PINECONE_INDEX_NAME`

## Performance & Cost

### Caching Strategy

The system includes query caching for improved performance:

- In-memory cache for common queries
- 5-minute TTL for cached results
- Automatic cache invalidation

### Cost Estimates

- **Venice AI:** ~$0.0001 per 1K tokens (embeddings)
- **Pinecone:** Free tier: 1 index, ~100K vectors; Paid: $70/month for 1M vectors
- **Per search:** 1 Venice API call (~$0.0001) + Pinecone query (included)

### Optimization Tips

- Use batch processing for bulk operations
- Implement query caching for repeated searches
- Set appropriate `minScore` filters to reduce noise
- Use metadata filters to narrow search scope

## Troubleshooting

### Common Issues

1. **Missing API Keys**
   ```
   Error: Missing required environment variable: VENICE_API_KEY
   ```
   Solution: Check your `.env` file and ensure all required variables are set.

2. **Pinecone Index Not Found**
   ```
   Error: Index 'agent-registry' not found
   ```
   Solution: The indexing script will automatically create the index. Run `npm run index-agents`.

3. **Venice API Rate Limits**
   ```
   Error: Venice API error: 429 Too Many Requests
   ```
   Solution: Add delays between batch requests or implement exponential backoff.

### Debug Mode

Set `NODE_ENV=development` for detailed logging:

```bash
NODE_ENV=development npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review the API documentation
- Open an issue on GitHub

## Roadmap

- [ ] Full-text search alongside vector search
- [ ] Agent health monitoring
- [ ] Admin UI for managing agents
- [ ] Authentication for agent registration
- [ ] Analytics for search patterns
- [ ] Skill-level search capabilities
