// Cloudflare Worker version of the Quality Assurance Agent
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
      return new Response(JSON.stringify({ status: 'ok', service: 'quality-assurance-agent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Agent card endpoint
    if (url.pathname === '/card' || url.pathname === '/.well-known/agent-card.json') {
      const agentCard = {
        name: 'Quality Assurance Agent',
        description: 'Automated testing and quality assurance for software applications',
        url: 'https://agents.example.com/qa-agent',
        provider: {
          organization: 'TestAI',
          url: 'https://example.com/testai',
        },
        version: '1.9.0',
        capabilities: {
          streaming: true,
          pushNotifications: false,
          stateTransitionHistory: true,
        },
        defaultInputModes: ['application/json', 'text/plain'],
        defaultOutputModes: ['application/json', 'text/markdown'],
        skills: [
          {
            id: 'test_generation',
            name: 'Test Generation',
            description: 'Automatically generates test cases for applications',
            tags: ['testing', 'automation', 'quality'],
            inputModes: ['application/json', 'text/plain'],
            outputModes: ['application/json', 'text/markdown'],
          },
          {
            id: 'bug_detection',
            name: 'Bug Detection',
            description: 'Identifies potential bugs and issues in code',
            tags: ['bugs', 'detection', 'quality'],
            inputModes: ['application/json', 'text/plain'],
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
        
        console.log('Creating QA task:', taskId);
        console.log('Task input:', body);

        // Store task in memory (in production, use KV or D1)
        const task = {
          id: taskId,
          status: 'submitted',
          input: body,
          createdAt: new Date().toISOString(),
        };

        // Process QA analysis using Venice AI
        const result = await processQAAnalysis(body.task?.input, env.VENICE_API_KEY);
        
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
          testCases: [],
          bugs: [],
          recommendations: []
        }
      };

      return new Response(JSON.stringify(task), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response
    return new Response(JSON.stringify({ 
      message: 'Quality Assurance Agent Worker',
      endpoints: ['/health', '/card', '/tasks']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Venice AI QA analysis processing function
async function processQAAnalysis(input, apiKey) {
  console.log('Processing QA analysis with Venice AI...');
  console.log('Input:', input);
  console.log('API Key:', apiKey ? 'Present' : 'Missing');
  
  if (!input) {
    throw new Error('No input provided for QA analysis');
  }

  // Determine the skill to use based on input
  const skill = input.skill || 'test_generation';
  const code = input.code || input.text || input;
  const language = input.language || 'JavaScript';
  const framework = input.framework || '';
  
  let systemPrompt, userPrompt;
  
  if (skill === 'bug_detection') {
    systemPrompt = 'You are an expert software quality assurance engineer and bug hunter. Analyze the provided code for potential bugs, issues, edge cases, and quality problems. Return your analysis as JSON with the following format: {"bugs": [{"type": "bug_type", "severity": "high|medium|low", "description": "bug description", "line": 10, "suggestion": "fix suggestion"}], "overallScore": 7, "summary": "Overall quality assessment"}.';
    userPrompt = `Analyze this ${language} code for bugs and quality issues:\n\n\`\`\`${language}\n${code}\n\`\`\``;
  } else {
    systemPrompt = 'You are an expert test engineer. Generate comprehensive test cases for the provided code, including unit tests, integration tests, and edge cases. Return your analysis as JSON with the following format: {"testCases": [{"name": "test name", "type": "unit|integration|e2e", "description": "test description", "steps": ["step1", "step2"], "expectedResult": "expected outcome"}], "coverage": "estimated coverage percentage", "recommendations": ["recommendation1", "recommendation2"]}.';
    userPrompt = `Generate test cases for this ${language} code${framework ? ` using ${framework}` : ''}:\n\n\`\`\`${language}\n${code}\n\`\`\``;
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
  
  const result = data.choices[0]?.message?.content || 'QA analysis failed';
  
  console.log('QA analysis result:', result.substring(0, 200) + '...');
  
  // Try to parse JSON result
  try {
    const parsedResult = JSON.parse(result);
    return {
      ...parsedResult,
      skill: skill,
      analyzedCode: code,
      language: language,
      framework: framework
    };
  } catch {
    return {
      analysis: result,
      testCases: [],
      bugs: [],
      skill: skill,
      analyzedCode: code,
      language: language
    };
  }
}
