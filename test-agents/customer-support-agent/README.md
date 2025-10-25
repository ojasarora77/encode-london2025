# Intelligent Customer Support Agent

A Cloudflare Worker that provides AI-powered customer service with sentiment analysis and ticket routing using Llama 3.3 70B via Venice AI.

## Features
- **Sentiment Analysis**: Analyzes customer sentiment and emotional state
- **Ticket Routing**: Automatically routes tickets to appropriate departments
- **Multi-format Support**: Handles plain text and JSON inputs
- **A2A Compatible**: Proper agent card format with skills and capabilities
- **Cloudflare Worker**: Runs on Cloudflare's edge network

## Usage

Start the development server:
```bash
npm run dev
```

The agent will be available at `http://localhost:41245/`

## Endpoints
- `GET /health` - Health check
- `GET /card` - Agent capabilities
- `POST /tasks` - Create customer support tasks

## Skills

### sentiment_analysis
Analyzes customer sentiment and emotional state.

**Input:**
```json
{
  "skill": "sentiment_analysis",
  "message": "I'm really frustrated with this product. It doesn't work as advertised!"
}
```

**Output:**
```json
{
  "sentiment": "negative",
  "emotion": "frustrated",
  "urgency": "high",
  "tone": "aggressive",
  "confidence": 0.92,
  "summary": "Customer is frustrated and needs immediate attention",
  "skill": "sentiment_analysis"
}
```

### ticket_routing
Automatically routes tickets to appropriate departments.

**Input:**
```json
{
  "skill": "ticket_routing",
  "message": "I was charged twice for my subscription this month"
}
```

**Output:**
```json
{
  "department": "billing",
  "priority": "high",
  "category": "billing_error",
  "reasoning": "Double charge issue requires billing department attention",
  "skill": "ticket_routing"
}
```

## Environment Variables
Set your Venice AI API key in `.dev.vars`:
```
VENICE_API_KEY=your_venice_api_key_here
```
