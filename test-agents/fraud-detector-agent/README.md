# Fraud Detection Agent

A Cloudflare Worker that provides advanced fraud detection using machine learning and pattern recognition using Llama 3.3 70B via Venice AI.

## Features
- **Anomaly Detection**: Identifies unusual patterns that may indicate fraud
- **Risk Scoring**: Calculates risk scores for transactions and activities
- **Multi-domain Support**: Works with financial, e-commerce, and other transaction data
- **A2A Compatible**: Proper agent card format with skills and capabilities
- **Cloudflare Worker**: Runs on Cloudflare's edge network

## Usage

Start the development server:
```bash
npm run dev
```

The agent will be available at `http://localhost:41251/`

## Endpoints
- `GET /health` - Health check
- `GET /card` - Agent capabilities
- `POST /tasks` - Create fraud detection tasks

## Skills

### anomaly_detection
Identifies unusual patterns that may indicate fraud.

**Input:**
```json
{
  "skill": "anomaly_detection",
  "transaction": {
    "amount": 5000,
    "merchant": "Unknown Store",
    "location": "Different Country",
    "time": "3:00 AM",
    "device": "New Device"
  },
  "userHistory": [
    {"amount": 50, "merchant": "Local Store", "time": "2:00 PM"},
    {"amount": 25, "merchant": "Coffee Shop", "time": "8:00 AM"}
  ],
  "context": "payment"
}
```

**Output:**
```json
{
  "anomalies": [
    {
      "type": "unusual_amount",
      "severity": "high",
      "description": "Transaction amount 100x higher than typical user spending",
      "confidence": 0.95
    },
    {
      "type": "unusual_location",
      "severity": "medium", 
      "description": "Transaction from different country with no travel history",
      "confidence": 0.88
    },
    {
      "type": "unusual_time",
      "severity": "medium",
      "description": "Transaction at 3:00 AM, user typically active during day",
      "confidence": 0.82
    }
  ],
  "overallRisk": "high",
  "recommendations": [
    "Flag transaction for manual review",
    "Request additional verification",
    "Monitor for similar patterns"
  ],
  "reasoning": "Multiple high-severity anomalies detected indicating potential fraud",
  "skill": "anomaly_detection"
}
```

### risk_scoring
Calculates risk scores for transactions and activities.

**Input:**
```json
{
  "skill": "risk_scoring",
  "transaction": {
    "amount": 150,
    "merchant": "Verified Store",
    "location": "User's City",
    "time": "2:00 PM",
    "device": "Known Device"
  },
  "userHistory": [
    {"amount": 200, "merchant": "Similar Store", "time": "1:00 PM"},
    {"amount": 100, "merchant": "Same Category", "time": "3:00 PM"}
  ],
  "context": "payment"
}
```

**Output:**
```json
{
  "riskScore": 0.15,
  "riskLevel": "low",
  "indicators": [
    "Normal spending pattern",
    "Familiar merchant category",
    "Expected location and time"
  ],
  "recommendations": [
    "Approve transaction",
    "Continue normal monitoring"
  ],
  "confidence": 0.92,
  "reasoning": "Transaction matches user's typical behavior patterns with no red flags",
  "skill": "risk_scoring"
}
```

## Environment Variables
Set your Venice AI API key in `.dev.vars`:
```
VENICE_API_KEY=your_venice_api_key_here
```
