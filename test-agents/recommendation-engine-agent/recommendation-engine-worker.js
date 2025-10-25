// Cloudflare Worker version of the Recommendation Engine Agent
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'recommendation-engine-agent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Agent card endpoint
    if (url.pathname === '/card' || url.pathname === '/.well-known/agent-card.json') {
      const agentCard = {
        name: 'Recommendation Engine',
        description: 'Personalized recommendation system for products, content, and services',
        url: 'https://agents.example.com/recommendation-engine',
        provider: {
          organization: 'RecommendAI',
          url: 'https://example.com/recommendai',
        },
        version: '3.5.0',
        capabilities: {
          streaming: true,
          pushNotifications: false,
          stateTransitionHistory: true,
        },
        defaultInputModes: ['application/json', 'text/plain'],
        defaultOutputModes: ['application/json', 'text/plain'],
        skills: [
          {
            id: 'collaborative_filtering',
            name: 'Collaborative Filtering',
            description: 'Provides recommendations based on user behavior patterns',
            tags: ['recommendations', 'collaborative', 'ml'],
            inputModes: ['application/json', 'text/plain'],
            outputModes: ['application/json'],
          },
          {
            id: 'content_based',
            name: 'Content-Based Filtering',
            description: 'Recommends based on item characteristics and user preferences',
            tags: ['recommendations', 'content', 'ml'],
            inputModes: ['application/json', 'text/plain'],
            outputModes: ['application/json'],
          },
        ],
      };

      return new Response(JSON.stringify(agentCard), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Task creation endpoint
    if (url.pathname === '/tasks' && request.method === 'POST') {
      try {
        const body = await request.json();
        const taskId = crypto.randomUUID();
        
        console.log('Creating recommendation task:', taskId);
        console.log('Task input:', body);

        // Store task in memory (in production, use KV or D1)
        const task = {
          id: taskId,
          status: 'submitted',
          input: body,
          createdAt: new Date().toISOString(),
        };

        // Process recommendation using Venice AI
        const result = await processRecommendation(body.task?.input, env.VENICE_API_KEY);
        
        const completedTask = {
          ...task,
          status: 'completed',
          result: result,
          completedAt: new Date().toISOString(),
        };

        return new Response(JSON.stringify(completedTask), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Task creation error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Task status endpoint
    if (url.pathname.startsWith('/tasks/') && request.method === 'GET') {
      const taskId = url.pathname.split('/')[2];
      console.log('Getting task status:', taskId);
      
      // Return a simple completed task
      const task = {
        id: taskId,
        status: 'completed',
        result: {
          recommendations: [],
          confidence: 0.8,
          reasoning: "Based on user preferences and behavior patterns"
        }
      };

      return new Response(JSON.stringify(task), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response
    return new Response(JSON.stringify({ 
      message: 'Recommendation Engine Agent Worker',
      endpoints: ['/health', '/card', '/tasks']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Venice AI recommendation processing function
async function processRecommendation(input, apiKey) {
  console.log('Processing recommendation with Venice AI...');
  console.log('Input:', input);
  console.log('API Key:', apiKey ? 'Present' : 'Missing');
  
  if (!input) {
    throw new Error('No input provided for recommendation');
  }

  // Determine the skill to use based on input
  const skill = input.skill || 'collaborative_filtering';
  const userProfile = input.userProfile || input.user || {};
  const items = input.items || input.products || [];
  const context = input.context || 'general';
  
  let systemPrompt, userPrompt;
  
  if (skill === 'content_based') {
    systemPrompt = 'You are an expert recommendation system engineer specializing in content-based filtering. Analyze user preferences and item characteristics to provide personalized recommendations. Return your analysis as JSON with the following format: {"recommendations": [{"item": "item_name", "score": 0.95, "reason": "why recommended", "category": "category"}], "confidence": 0.9, "reasoning": "explanation of recommendation logic"}.';
    userPrompt = `Provide content-based recommendations for a user with preferences: ${JSON.stringify(userProfile)}. Available items: ${JSON.stringify(items)}. Context: ${context}`;
  } else {
    systemPrompt = 'You are an expert recommendation system engineer specializing in collaborative filtering. Analyze user behavior patterns and similar users to provide personalized recommendations. Return your analysis as JSON with the following format: {"recommendations": [{"item": "item_name", "score": 0.95, "reason": "why recommended", "similarUsers": "users who liked this"}], "confidence": 0.9, "reasoning": "explanation of recommendation logic"}.';
    userPrompt = `Provide collaborative filtering recommendations for a user with behavior: ${JSON.stringify(userProfile)}. Available items: ${JSON.stringify(items)}. Context: ${context}`;
  }
  
  const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.4
    })
  });

  console.log('Venice AI Response Status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Venice AI API error:', response.status, response.statusText);
    console.error('Error response body:', errorText);
    throw new Error(`Venice AI API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Venice AI Response Data:', JSON.stringify(data, null, 2));
  
  const result = data.choices[0]?.message?.content || 'Recommendation failed';
  
  console.log('Recommendation result:', result.substring(0, 200) + '...');
  
  // Try to parse JSON result
  try {
    const parsedResult = JSON.parse(result);
    return {
      ...parsedResult,
      skill: skill,
      userProfile: userProfile,
      context: context
    };
  } catch {
    return {
      recommendations: [],
      confidence: 0.5,
      reasoning: result,
      skill: skill,
      userProfile: userProfile
    };
  }
}
