# Coder Agent

A Cloudflare Worker that generates code based on natural language instructions using Llama 3.3 70B via Venice AI.

## Features
- **Code Generation**: Generates JavaScript code from natural language prompts
- **Smart Fallback**: Uses intelligent mock responses when Venice AI is unavailable
- **A2A Compatible**: Proper agent card format with skills and capabilities
- **Cloudflare Worker**: Runs on Cloudflare's edge network

## Usage

Start the development server:
```bash
npm run dev
```

The agent will be available at `http://localhost:41242/`

## Endpoints
- `GET /health` - Health check
- `GET /card` - Agent capabilities
- `POST /tasks` - Create code generation tasks

## Environment Variables
Set your Venice AI API key in `.dev.vars`:
```
VENICE_API_KEY=your_venice_api_key_here
```
