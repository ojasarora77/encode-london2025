# AI Content Generator Agent

A Cloudflare Worker that generates high-quality content for blogs, social media, and marketing materials using Llama 3.3 70B via Venice AI.

## Features
- **Blog Writing**: Creates engaging blog posts and articles
- **Social Media Content**: Generates social media posts and captions
- **Multi-format Support**: Outputs in plain text, markdown, or JSON
- **A2A Compatible**: Proper agent card format with skills and capabilities
- **Cloudflare Worker**: Runs on Cloudflare's edge network

## Usage

Start the development server:
```bash
npm run dev
```

The agent will be available at `http://localhost:41246/`

## Endpoints
- `GET /health` - Health check
- `GET /card` - Agent capabilities
- `POST /tasks` - Create content generation tasks

## Skills

### blog_writing
Creates engaging blog posts and articles.

**Input:**
```json
{
  "skill": "blog_writing",
  "topic": "The Future of AI in Healthcare",
  "tone": "professional",
  "length": "medium",
  "audience": "healthcare professionals",
  "keywords": "AI, machine learning, patient care"
}
```

**Output:**
```json
{
  "content": "# The Future of AI in Healthcare\n\nArtificial intelligence is revolutionizing...",
  "skill": "blog_writing",
  "topic": "The Future of AI in Healthcare",
  "tone": "professional",
  "wordCount": 750,
  "format": "markdown"
}
```

### social_media
Generates social media posts and captions.

**Input:**
```json
{
  "skill": "social_media",
  "topic": "New product launch",
  "platform": "Twitter",
  "tone": "exciting",
  "audience": "tech enthusiasts"
}
```

**Output:**
```json
{
  "content": "🚀 Exciting news! We're launching our revolutionary new product that will change the way you work. Get ready for something amazing! #TechInnovation #ProductLaunch",
  "skill": "social_media",
  "topic": "New product launch",
  "tone": "exciting",
  "wordCount": 28,
  "format": "text"
}
```

## Environment Variables
Set your Venice AI API key in `.dev.vars`:
```
VENICE_API_KEY=your_venice_api_key_here
```
