# Meeting Analysis Agent

A Cloudflare Worker that analyzes meeting transcripts, extracts action items, and generates summaries using Llama 3.3 70B via Venice AI.

## Features
- **Action Item Extraction**: Identifies and extracts action items from meetings
- **Meeting Summary**: Generates concise meeting summaries
- **Multi-format Support**: Outputs in JSON or markdown
- **A2A Compatible**: Proper agent card format with skills and capabilities
- **Cloudflare Worker**: Runs on Cloudflare's edge network

## Usage

Start the development server:
```bash
npm run dev
```

The agent will be available at `http://localhost:41247/`

## Endpoints
- `GET /health` - Health check
- `GET /card` - Agent capabilities
- `POST /tasks` - Create meeting analysis tasks

## Skills

### action_items
Identifies and extracts action items from meetings.

**Input:**
```json
{
  "skill": "action_items",
  "transcript": "John: I'll send the report by Friday. Sarah: I can review the design mockups this week. Mike: Let's schedule a follow-up meeting for next Monday."
}
```

**Output:**
```json
{
  "actionItems": [
    {
      "task": "Send the report",
      "assignee": "John",
      "deadline": "Friday",
      "priority": "medium",
      "status": "pending"
    },
    {
      "task": "Review design mockups",
      "assignee": "Sarah",
      "deadline": "this week",
      "priority": "medium",
      "status": "pending"
    },
    {
      "task": "Schedule follow-up meeting",
      "assignee": "Mike",
      "deadline": "next Monday",
      "priority": "high",
      "status": "pending"
    }
  ],
  "totalItems": 3,
  "skill": "action_items"
}
```

### meeting_summary
Generates concise meeting summaries.

**Input:**
```json
{
  "skill": "meeting_summary",
  "transcript": "Team discussed Q4 goals and budget allocation. Marketing needs additional resources. Engineering is on track with the product roadmap."
}
```

**Output:**
```json
{
  "summary": "# Meeting Summary\n\n## Key Topics\n- Q4 Goals and Budget Allocation\n- Marketing Resource Needs\n- Engineering Product Roadmap\n\n## Decisions Made\n- Marketing department to receive additional resources\n- Engineering confirmed on track with roadmap\n\n## Next Steps\n- Finalize budget allocation\n- Review marketing resource requests",
  "skill": "meeting_summary",
  "format": "markdown"
}
```

## Environment Variables
Set your Venice AI API key in `.dev.vars`:
```
VENICE_API_KEY=your_venice_api_key_here
```
