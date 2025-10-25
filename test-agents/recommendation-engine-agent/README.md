# Recommendation Engine Agent

A Cloudflare Worker that provides personalized recommendation system for products, content, and services using Llama 3.3 70B via Venice AI.

## Features
- **Collaborative Filtering**: Provides recommendations based on user behavior patterns
- **Content-Based Filtering**: Recommends based on item characteristics and user preferences
- **Multi-domain Support**: Works with products, content, services, and more
- **A2A Compatible**: Proper agent card format with skills and capabilities
- **Cloudflare Worker**: Runs on Cloudflare's edge network

## Usage

Start the development server:
```bash
npm run dev
```

The agent will be available at `http://localhost:41250/`

## Endpoints
- `GET /health` - Health check
- `GET /card` - Agent capabilities
- `POST /tasks` - Create recommendation tasks

## Skills

### collaborative_filtering
Provides recommendations based on user behavior patterns.

**Input:**
```json
{
  "skill": "collaborative_filtering",
  "userProfile": {
    "userId": "user123",
    "preferences": ["action", "comedy", "sci-fi"],
    "history": ["movie1", "movie2", "movie3"],
    "ratings": {"movie1": 5, "movie2": 4, "movie3": 3}
  },
  "items": [
    {"id": "movie4", "title": "Action Movie", "genre": "action"},
    {"id": "movie5", "title": "Comedy Film", "genre": "comedy"},
    {"id": "movie6", "title": "Sci-Fi Adventure", "genre": "sci-fi"}
  ],
  "context": "movie recommendations"
}
```

**Output:**
```json
{
  "recommendations": [
    {
      "item": "Action Movie",
      "score": 0.95,
      "reason": "Matches user's action preference and high ratings for action movies",
      "similarUsers": "Users with similar taste also liked this"
    },
    {
      "item": "Sci-Fi Adventure", 
      "score": 0.88,
      "reason": "Strong sci-fi preference match",
      "similarUsers": "Sci-fi fans highly rate this"
    }
  ],
  "confidence": 0.92,
  "reasoning": "Based on user's strong preference for action and sci-fi genres with high ratings",
  "skill": "collaborative_filtering"
}
```

### content_based
Recommends based on item characteristics and user preferences.

**Input:**
```json
{
  "skill": "content_based",
  "userProfile": {
    "preferences": ["tech", "programming", "AI"],
    "interests": ["JavaScript", "Python", "Machine Learning"]
  },
  "items": [
    {"id": "book1", "title": "JavaScript Guide", "category": "programming", "tags": ["JavaScript", "web"]},
    {"id": "book2", "title": "Python for AI", "category": "programming", "tags": ["Python", "AI"]},
    {"id": "book3", "title": "Cooking Basics", "category": "lifestyle", "tags": ["cooking", "food"]}
  ],
  "context": "book recommendations"
}
```

**Output:**
```json
{
  "recommendations": [
    {
      "item": "Python for AI",
      "score": 0.98,
      "reason": "Perfect match for AI and Python interests",
      "category": "programming"
    },
    {
      "item": "JavaScript Guide",
      "score": 0.85,
      "reason": "Matches programming and JavaScript preferences",
      "category": "programming"
    }
  ],
  "confidence": 0.95,
  "reasoning": "Strong alignment between user interests and item characteristics",
  "skill": "content_based"
}
```

## Environment Variables
Set your Venice AI API key in `.dev.vars`:
```
VENICE_API_KEY=your_venice_api_key_here
```
