// Cloudflare Worker version of the Intelligent Customer Support Agent
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
      return new Response(JSON.stringify({ status: 'ok', service: 'customer-support-agent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Agent card endpoint
    if (url.pathname === '/card' || url.pathname === '/.well-known/agent-card.json') {
      const agentCard = {
        name: 'Intelligent Customer Support',
        description: 'AI-powered customer service agent with sentiment analysis and ticket routing',
        url: 'https://agents.example.com/customer-support',
        provider: {
          organization: 'SupportAI',
          url: 'https://example.com/supportai',
        },
        version: '2.5.0',
        capabilities: {
          streaming: true,
          pushNotifications: true,
          stateTransitionHistory: true,
        },
        defaultInputModes: ['text/plain', 'application/json'],
        defaultOutputModes: ['text/plain', 'application/json'],
        skills: [
          {
            id: 'sentiment_analysis',
            name: 'Sentiment Analysis',
            description: 'Analyzes customer sentiment and emotional state',
            tags: ['sentiment', 'nlp', 'customer-service'],
            inputModes: ['text/plain', 'application/json'],
            outputModes: ['application/json'],
          },
          {
            id: 'ticket_routing',
            name: 'Ticket Routing',
            description: 'Automatically routes tickets to appropriate departments',
            tags: ['routing', 'classification', 'automation'],
            inputModes: ['text/plain', 'application/json'],
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
        
        console.log('Creating customer support task:', taskId);
        console.log('Task input:', body);

        // Store task in memory (in production, use KV or D1)
        const task = {
          id: taskId,
          status: 'submitted',
          input: body,
          createdAt: new Date().toISOString(),
        };

        // Process customer support request using Venice AI
        const result = await processCustomerSupport(body.task?.input, env.VENICE_API_KEY);
        
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
          response: 'Customer support response would be here',
          sentiment: 'neutral',
          department: 'general'
        }
      };

      return new Response(JSON.stringify(task), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response
    return new Response(JSON.stringify({ 
      message: 'Intelligent Customer Support Agent Worker',
      endpoints: ['/health', '/card', '/tasks']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Venice AI customer support processing function
async function processCustomerSupport(input, apiKey) {
  console.log('Processing customer support with Venice AI...');
  console.log('Input:', input);
  console.log('API Key:', apiKey ? 'Present' : 'Missing');
  
  if (!input) {
    throw new Error('No input provided for customer support');
  }

  // Determine the skill to use based on input
  const skill = input.skill || 'sentiment_analysis';
  const message = input.message || input.text || input;
  
  let systemPrompt, userPrompt;
  
  if (skill === 'ticket_routing') {
    systemPrompt = 'You are a customer support routing specialist. Analyze the customer message and determine which department should handle it. Return your analysis as JSON with the following format: {"department": "technical|billing|sales|general", "priority": "low|medium|high|urgent", "category": "category name", "reasoning": "why this department"}.';
    userPrompt = `Route this customer ticket:\n\n"${message}"`;
  } else {
    systemPrompt = 'You are an expert in sentiment analysis and emotional intelligence. Analyze the customer message for sentiment, emotion, urgency, and tone. Return your analysis as JSON with the following format: {"sentiment": "positive|neutral|negative", "emotion": "happy|frustrated|angry|confused|neutral", "urgency": "low|medium|high", "tone": "friendly|professional|aggressive|polite", "confidence": 0.95, "summary": "brief analysis"}.';
    userPrompt = `Analyze the sentiment of this customer message:\n\n"${message}"`;
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
      max_tokens: 1500,
      temperature: 0.3
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
  
  const result = data.choices[0]?.message?.content || 'Analysis failed';
  
  console.log('Customer support result:', result.substring(0, 200) + '...');
  
  // Try to parse JSON result, fallback to text if parsing fails
  try {
    const parsedResult = JSON.parse(result);
    return {
      ...parsedResult,
      skill: skill,
      originalMessage: message
    };
  } catch {
    return {
      analysis: result,
      sentiment: 'neutral',
      skill: skill,
      originalMessage: message
    };
  }
}
