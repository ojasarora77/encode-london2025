# A2A Test Agents

This directory contains A2A (Agent-to-Agent) compatible Cloudflare Worker agents for testing and demonstration purposes.

## 🎯 Implemented Agents

All agents follow the A2A standard and are implemented as Cloudflare Workers using Venice AI (Llama 3.3 70B).

### 1. Coder Agent
- **Port**: 41242
- **Directory**: `coder-agent/`
- **Skills**: Code generation
- **Description**: Generates code based on natural language instructions

### 2. Multi-Language Translator
- **Port**: 41243
- **Directory**: `translator-agent/`
- **Skills**: Text translation, language detection
- **Description**: Translates text between 50+ languages with context awareness

### 3. AI Code Reviewer
- **Port**: 41244
- **Directory**: `code-reviewer-agent/`
- **Skills**: Security analysis, performance review
- **Description**: Automated code review with security and performance analysis

### 4. Intelligent Customer Support
- **Port**: 41245
- **Directory**: `customer-support-agent/`
- **Skills**: Sentiment analysis, ticket routing
- **Description**: AI-powered customer service with sentiment analysis

### 5. AI Content Generator
- **Port**: 41246
- **Directory**: `content-generator-agent/`
- **Skills**: Blog writing, social media content
- **Description**: Generates high-quality content for blogs and social media

### 6. Meeting Analysis Agent
- **Port**: 41247
- **Directory**: `meeting-analyzer-agent/`
- **Skills**: Action item extraction, meeting summaries
- **Description**: Analyzes meeting transcripts and extracts insights

### 7. Email Classification Agent
- **Port**: 41248
- **Directory**: `email-classifier-agent/`
- **Skills**: Email classification, spam detection
- **Description**: Automatically classifies emails by category and priority

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Venice AI API key

### Setup

1. **Install dependencies** for each agent:
```bash
cd <agent-directory>
npm install
```

2. **Create `.dev.vars` file** in each agent directory:
```
VENICE_API_KEY=your_venice_api_key_here
```

3. **Start an agent**:
```bash
cd <agent-directory>
npm run dev
```

The agent will be available at `http://localhost:<port>/`

### Start All Agents

You can start all agents simultaneously by running them in separate terminal windows:

```bash
# Terminal 1
cd coder-agent && npm run dev

# Terminal 2
cd translator-agent && npm run dev

# Terminal 3
cd code-reviewer-agent && npm run dev

# Terminal 4
cd customer-support-agent && npm run dev

# Terminal 5
cd content-generator-agent && npm run dev

# Terminal 6
cd meeting-analyzer-agent && npm run dev

# Terminal 7
cd email-classifier-agent && npm run dev
```

## 📋 A2A Standard Endpoints

Each agent implements the following standard endpoints:

- `GET /health` - Health check endpoint
- `GET /card` or `GET /.well-known/agent-card.json` - Agent card with capabilities
- `POST /tasks` - Create a new task
- `GET /tasks/{taskId}` - Get task status

## 🔧 Agent Card Structure

Each agent exposes an agent card that describes its capabilities:

```json
{
  "name": "Agent Name",
  "description": "Agent description",
  "url": "https://agents.example.com/agent",
  "provider": {
    "organization": "Organization Name",
    "url": "https://example.com"
  },
  "version": "1.0.0",
  "capabilities": {
    "streaming": true,
    "pushNotifications": false,
    "stateTransitionHistory": true
  },
  "defaultInputModes": ["text/plain", "application/json"],
  "defaultOutputModes": ["application/json", "text/plain"],
  "skills": [
    {
      "id": "skill_id",
      "name": "Skill Name",
      "description": "Skill description",
      "tags": ["tag1", "tag2"],
      "inputModes": ["text/plain"],
      "outputModes": ["application/json"]
    }
  ]
}
```

## 📝 Task Creation

Create a task by sending a POST request to `/tasks`:

```json
{
  "task": {
    "input": {
      "skill": "skill_id",
      "text": "Input text or data",
      // ... other skill-specific parameters
    }
  }
}
```

Response:

```json
{
  "id": "task-uuid",
  "status": "completed",
  "input": { /* ... */ },
  "result": { /* skill-specific result */ },
  "createdAt": "2025-10-25T00:00:00.000Z",
  "completedAt": "2025-10-25T00:00:01.000Z"
}
```

## 🔍 Testing Agents

### Using curl

```bash
# Get agent card
curl http://localhost:41243/card

# Create a translation task
curl -X POST http://localhost:41243/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "input": {
        "skill": "translate_text",
        "text": "Hello, how are you?",
        "targetLanguage": "Spanish"
      }
    }
  }'
```

### Using JavaScript

```javascript
// Get agent card
const card = await fetch('http://localhost:41243/card').then(r => r.json());

// Create a task
const task = await fetch('http://localhost:41243/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task: {
      input: {
        skill: 'translate_text',
        text: 'Hello, how are you?',
        targetLanguage: 'Spanish'
      }
    }
  })
}).then(r => r.json());

console.log(task.result);
```

## 📚 Documentation

Each agent has its own README.md with detailed documentation:
- Skill descriptions
- Input/output formats
- Example requests and responses
- Environment variable requirements

## 🔗 Related Projects

- **Agent Registry**: Semantic agent search with Venice AI + Pinecone
- **Agent Registry MCP**: MCP server for paid agent search with x402 payments
- **Agent Reputation System**: Track and score agent performance

## 📊 Status Tracking

See `AGENTS_TODO.md` for a complete list of all agents from sample-agents.json and their implementation status.

## 🤝 Contributing

To add a new agent:

1. Create a new directory: `<agent-name>-agent/`
2. Copy the structure from an existing agent
3. Update the agent card with your agent's capabilities
4. Implement the skills using Venice AI
5. Update `AGENTS_TODO.md` with the new agent status
6. Test the agent locally
7. Deploy to Cloudflare Workers

## 📄 License

MIT
