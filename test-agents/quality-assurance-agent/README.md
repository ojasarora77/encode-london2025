# Quality Assurance Agent

A Cloudflare Worker that provides automated testing and quality assurance for software applications using Llama 3.3 70B via Venice AI.

## Features
- **Test Generation**: Automatically generates test cases for applications
- **Bug Detection**: Identifies potential bugs and issues in code
- **Multi-language Support**: Works with JavaScript, Python, Java, and more
- **A2A Compatible**: Proper agent card format with skills and capabilities
- **Cloudflare Worker**: Runs on Cloudflare's edge network

## Usage

Start the development server:
```bash
npm run dev
```

The agent will be available at `http://localhost:41249/`

## Endpoints
- `GET /health` - Health check
- `GET /card` - Agent capabilities
- `POST /tasks` - Create QA analysis tasks

## Skills

### test_generation
Automatically generates test cases for applications.

**Input:**
```json
{
  "skill": "test_generation",
  "code": "function add(a, b) { return a + b; }",
  "language": "JavaScript",
  "framework": "Jest"
}
```

**Output:**
```json
{
  "testCases": [
    {
      "name": "should add two positive numbers",
      "type": "unit",
      "description": "Test addition of two positive numbers",
      "steps": ["Call add(2, 3)", "Verify result is 5"],
      "expectedResult": "5"
    },
    {
      "name": "should handle negative numbers",
      "type": "unit", 
      "description": "Test addition with negative numbers",
      "steps": ["Call add(-1, 1)", "Verify result is 0"],
      "expectedResult": "0"
    }
  ],
  "coverage": "95%",
  "recommendations": ["Add edge case tests", "Test with zero values"],
  "skill": "test_generation"
}
```

### bug_detection
Identifies potential bugs and issues in code.

**Input:**
```json
{
  "skill": "bug_detection",
  "code": "function divide(a, b) { return a / b; }",
  "language": "JavaScript"
}
```

**Output:**
```json
{
  "bugs": [
    {
      "type": "division_by_zero",
      "severity": "high",
      "description": "Function does not handle division by zero",
      "line": 1,
      "suggestion": "Add zero check: if (b === 0) throw new Error('Division by zero')"
    }
  ],
  "overallScore": 6,
  "summary": "Code has potential division by zero vulnerability",
  "skill": "bug_detection"
}
```

## Environment Variables
Set your Venice AI API key in `.dev.vars`:
```
VENICE_API_KEY=your_venice_api_key_here
```
