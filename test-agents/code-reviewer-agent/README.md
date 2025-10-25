# AI Code Reviewer Agent

A Cloudflare Worker that performs automated code review with security analysis, performance optimization, and best practices using Llama 3.3 70B via Venice AI.

## Features
- **Security Analysis**: Identifies security vulnerabilities and suggests fixes
- **Performance Review**: Analyzes code for performance bottlenecks and optimization opportunities
- **Multi-format Support**: Handles plain text and JSON inputs
- **A2A Compatible**: Proper agent card format with skills and capabilities
- **Cloudflare Worker**: Runs on Cloudflare's edge network

## Usage

Start the development server:
```bash
npm run dev
```

The agent will be available at `http://localhost:41244/`

## Endpoints
- `GET /health` - Health check
- `GET /card` - Agent capabilities
- `POST /tasks` - Create code review tasks

## Skills

### security_analysis
Identifies security vulnerabilities and suggests fixes.

**Input:**
```json
{
  "skill": "security_analysis",
  "code": "const query = 'SELECT * FROM users WHERE id = ' + userId;"
}
```

**Output:**
```json
{
  "issues": [
    {
      "type": "security",
      "severity": "high",
      "description": "SQL injection vulnerability",
      "line": 1,
      "suggestion": "Use parameterized queries"
    }
  ],
  "overallScore": 3,
  "summary": "Critical security issues found",
  "skill": "security_analysis"
}
```

### performance_review
Analyzes code for performance bottlenecks and optimization opportunities.

**Input:**
```json
{
  "skill": "performance_review",
  "code": "for(let i=0; i<arr.length; i++) { /* ... */ }"
}
```

**Output:**
```json
{
  "issues": [
    {
      "type": "performance",
      "severity": "medium",
      "description": "Array length recalculated on each iteration",
      "line": 1,
      "suggestion": "Cache array length in a variable"
    }
  ],
  "overallScore": 7,
  "summary": "Minor performance improvements available",
  "skill": "performance_review"
}
```

## Environment Variables
Set your Venice AI API key in `.dev.vars`:
```
VENICE_API_KEY=your_venice_api_key_here
```
