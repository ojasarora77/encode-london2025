// Cloudflare Worker version of the Coder Agent
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
      return new Response(JSON.stringify({ status: 'ok', service: 'coder-agent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Agent card endpoint
    if (url.pathname === '/card' || url.pathname === '/.well-known/agent-card.json') {
      const agentCard = {
        name: 'Coder Agent',
        description: 'An agent that generates code based on natural language instructions using Llama 3.3 70B via Venice AI.',
        url: 'https://coder-agent.workers.dev/',
        provider: {
          organization: 'A2A Samples',
          url: 'https://example.com/a2a-samples',
        },
        version: '0.0.3',
        capabilities: {
          streaming: true,
          pushNotifications: false,
          stateTransitionHistory: true,
        },
        defaultInputModes: ['text'],
        defaultOutputModes: ['text', 'file'],
        skills: [
          {
            id: 'code_generation',
            name: 'Code Generation',
            description: 'Generates code snippets or complete files based on user requests using Llama 3.3 70B.',
            tags: ['code', 'development', 'programming', 'llama', 'venice-ai'],
            inputModes: ['text'],
            outputModes: ['text', 'file'],
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
        
        console.log('Creating task:', taskId);
        console.log('Task input:', body);

        // Store task in memory (in production, use KV or D1)
        const task = {
          id: taskId,
          status: 'submitted',
          input: body,
          createdAt: new Date().toISOString(),
        };

        // Generate code using Venice AI
        const generatedCode = await generateCode(body.task?.input?.text || 'Generate some code', env.VENICE_API_KEY);
        
        const completedTask = {
          ...task,
          status: 'completed',
          result: {
            files: [
              {
                filename: 'generated_code.js',
                content: generatedCode
              }
            ]
          },
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
          files: [
            {
              filename: 'generated_code.js',
              content: '// Generated code would be here'
            }
          ]
        }
      };

      return new Response(JSON.stringify(task), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response
    return new Response(JSON.stringify({ 
      message: 'Coder Agent Worker',
      endpoints: ['/health', '/card', '/tasks']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Venice AI code generation function
async function generateCode(prompt, apiKey) {
  console.log('Generating code with Venice AI...');
  console.log('Prompt:', prompt);
  console.log('API Key:', apiKey ? 'Present' : 'Missing');
  
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
          content: 'You are a helpful coding assistant. Generate clean, well-formatted code based on the user\'s request.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })
  });

  console.log('Venice AI Response Status:', response.status);
  console.log('Venice AI Response Headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Venice AI API error:', response.status, response.statusText);
    console.error('Error response body:', errorText);
    throw new Error(`Venice AI API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Venice AI Response Data:', JSON.stringify(data, null, 2));
  
  const generatedCode = data.choices[0]?.message?.content || '// No code generated';
  
  console.log('Generated code:', generatedCode.substring(0, 100) + '...');
  return generatedCode;
}