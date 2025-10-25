// Cloudflare Worker version of the AI Code Reviewer Agent
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
      return new Response(JSON.stringify({ status: 'ok', service: 'code-reviewer-agent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Agent card endpoint
    if (url.pathname === '/card' || url.pathname === '/.well-known/agent-card.json') {
      const agentCard = {
        name: 'AI Code Reviewer',
        description: 'Automated code review with security analysis, performance optimization, and best practices',
        url: 'https://agents.example.com/code-reviewer',
        provider: {
          organization: 'DevTools AI',
          url: 'https://example.com/devtools-ai',
        },
        version: '1.8.0',
        capabilities: {
          streaming: true,
          pushNotifications: false,
          stateTransitionHistory: true,
        },
        defaultInputModes: ['text/plain', 'application/json'],
        defaultOutputModes: ['application/json', 'text/markdown'],
        skills: [
          {
            id: 'security_analysis',
            name: 'Security Analysis',
            description: 'Identifies security vulnerabilities and suggests fixes',
            tags: ['security', 'code-analysis', 'vulnerability'],
            inputModes: ['text/plain', 'application/json'],
            outputModes: ['application/json', 'text/markdown'],
          },
          {
            id: 'performance_review',
            name: 'Performance Review',
            description: 'Analyzes code for performance bottlenecks and optimization opportunities',
            tags: ['performance', 'optimization', 'code-analysis'],
            inputModes: ['text/plain', 'application/json'],
            outputModes: ['application/json', 'text/markdown'],
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
        
        console.log('Creating code review task:', taskId);
        console.log('Task input:', body);

        // Store task in memory (in production, use KV or D1)
        const task = {
          id: taskId,
          status: 'submitted',
          input: body,
          createdAt: new Date().toISOString(),
        };

        // Process code review using Venice AI
        const result = await processCodeReview(body.task?.input, env.VENICE_API_KEY);
        
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
          review: 'Code review would be here',
          issues: [],
          suggestions: []
        }
      };

      return new Response(JSON.stringify(task), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response
    return new Response(JSON.stringify({ 
      message: 'AI Code Reviewer Agent Worker',
      endpoints: ['/health', '/card', '/tasks']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Venice AI code review processing function
async function processCodeReview(input, apiKey) {
  console.log('Processing code review with Venice AI...');
  console.log('Input:', input);
  console.log('API Key:', apiKey ? 'Present' : 'Missing');
  
  if (!input) {
    throw new Error('No input provided for code review');
  }

  // Determine the skill to use based on input
  const skill = input.skill || 'security_analysis';
  const code = input.code || input;
  
  let systemPrompt, userPrompt;
  
  if (skill === 'performance_review') {
    systemPrompt = 'You are an expert software engineer specializing in performance optimization. Analyze the provided code for performance bottlenecks, inefficiencies, and optimization opportunities. Return your analysis as a structured JSON response with the following format: {"issues": [{"type": "performance", "severity": "high", "description": "issue description", "line": 10, "suggestion": "optimization suggestion"}], "overallScore": 7, "summary": "Overall performance assessment"}.';
    userPrompt = `Analyze this code for performance issues:\n\n\`\`\`\n${code}\n\`\`\``;
  } else {
    systemPrompt = 'You are a cybersecurity expert and code reviewer. Analyze the provided code for security vulnerabilities, potential exploits, and security best practices violations. Return your analysis as a structured JSON response with the following format: {"issues": [{"type": "security", "severity": "high", "description": "vulnerability description", "line": 10, "suggestion": "security fix"}], "overallScore": 8, "summary": "Overall security assessment"}.';
    userPrompt = `Analyze this code for security vulnerabilities:\n\n\`\`\`\n${code}\n\`\`\``;
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
      max_tokens: 3000,
      temperature: 0.2
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
  
  const result = data.choices[0]?.message?.content || 'Code review failed';
  
  console.log('Code review result:', result.substring(0, 200) + '...');
  
  // Try to parse JSON result, fallback to text if parsing fails
  try {
    const parsedResult = JSON.parse(result);
    return {
      ...parsedResult,
      skill: skill,
      reviewedCode: code
    };
  } catch {
    return {
      review: result,
      issues: [],
      overallScore: 5,
      summary: 'Code review completed with text analysis',
      skill: skill,
      reviewedCode: code
    };
  }
}
