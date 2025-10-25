# Email Classification Agent

A Cloudflare Worker that automatically classifies emails by category, priority, and sentiment, and detects spam using Llama 3.3 70B via Venice AI.

## Features
- **Email Classification**: Categorizes emails by type and importance
- **Spam Detection**: Identifies and filters spam emails
- **Multi-format Support**: Handles plain text and JSON inputs
- **A2A Compatible**: Proper agent card format with skills and capabilities
- **Cloudflare Worker**: Runs on Cloudflare's edge network

## Usage

Start the development server:
```bash
npm run dev
```

The agent will be available at `http://localhost:41248/`

## Endpoints
- `GET /health` - Health check
- `GET /card` - Agent capabilities
- `POST /tasks` - Create email classification tasks

## Skills

### email_classification
Categorizes emails by type and importance.

**Input:**
```json
{
  "skill": "email_classification",
  "from": "boss@company.com",
  "subject": "Urgent: Q4 Budget Review Meeting Tomorrow",
  "body": "Hi team, we need to finalize the Q4 budget. Please review the attached spreadsheet before tomorrow's meeting at 2 PM."
}
```

**Output:**
```json
{
  "category": "work",
  "priority": "urgent",
  "sentiment": "neutral",
  "requiresAction": true,
  "suggestedFolder": "Important",
  "confidence": 0.95,
  "summary": "Urgent meeting request for Q4 budget review",
  "skill": "email_classification"
}
```

### spam_detection
Identifies and filters spam emails.

**Input:**
```json
{
  "skill": "spam_detection",
  "from": "winner@suspicious-domain.xyz",
  "subject": "CONGRATULATIONS! You've won $1,000,000!!!",
  "body": "Click here NOW to claim your prize! Limited time offer! Act fast or lose your winnings forever!"
}
```

**Output:**
```json
{
  "isSpam": true,
  "confidence": 0.98,
  "spamScore": 9.5,
  "indicators": [
    "suspicious sender domain",
    "excessive urgency tactics",
    "unrealistic claims",
    "excessive punctuation"
  ],
  "reasoning": "Email exhibits multiple spam indicators including suspicious domain, urgency tactics, and unrealistic monetary claims",
  "skill": "spam_detection"
}
```

## Environment Variables
Set your Venice AI API key in `.dev.vars`:
```
VENICE_API_KEY=your_venice_api_key_here
```
