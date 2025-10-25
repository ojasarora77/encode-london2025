# Multi-Language Translator Agent

A Cloudflare Worker that translates text between 50+ languages with context awareness and cultural adaptation using Llama 3.3 70B via Venice AI.

## Features
- **Text Translation**: Translates text while preserving context and cultural nuances
- **Language Detection**: Automatically detects source language for translation
- **Multi-format Support**: Handles plain text and JSON inputs
- **A2A Compatible**: Proper agent card format with skills and capabilities
- **Cloudflare Worker**: Runs on Cloudflare's edge network

## Usage

Start the development server:
```bash
npm run dev
```

The agent will be available at `http://localhost:41243/`

## Endpoints
- `GET /health` - Health check
- `GET /card` - Agent capabilities
- `POST /tasks` - Create translation tasks

## Skills

### translate_text
Translates text while preserving context and cultural nuances.

**Input:**
```json
{
  "skill": "translate_text",
  "text": "Hello, how are you?",
  "targetLanguage": "Spanish"
}
```

**Output:**
```json
{
  "translatedText": "Hola, ¿cómo estás?",
  "originalText": "Hello, how are you?",
  "targetLanguage": "Spanish",
  "skill": "translate_text"
}
```

### detect_language
Automatically detects source language for translation.

**Input:**
```json
{
  "skill": "detect_language",
  "text": "Bonjour, comment allez-vous?"
}
```

**Output:**
```json
{
  "language": "French",
  "confidence": 0.95,
  "code": "fr"
}
```

## Environment Variables
Set your Venice AI API key in `.dev.vars`:
```
VENICE_API_KEY=your_venice_api_key_here
```
