// Cloudflare Worker version of the Fraud Detection Agent
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
      return new Response(JSON.stringify({ status: 'ok', service: 'fraud-detector-agent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Agent card endpoint
    if (url.pathname === '/card' || url.pathname === '/.well-known/agent-card.json') {
      const agentCard = {
        name: 'Fraud Detection Agent',
        description: 'Advanced fraud detection using machine learning and pattern recognition',
        url: 'https://agents.example.com/fraud-detector',
        provider: {
          organization: 'SecurityAI',
          url: 'https://example.com/securityai',
        },
        version: '2.8.0',
        capabilities: {
          streaming: true,
          pushNotifications: true,
          stateTransitionHistory: true,
        },
        defaultInputModes: ['application/json', 'text/plain'],
        defaultOutputModes: ['application/json', 'text/plain'],
        skills: [
          {
            id: 'anomaly_detection',
            name: 'Anomaly Detection',
            description: 'Identifies unusual patterns that may indicate fraud',
            tags: ['fraud', 'anomaly', 'security'],
            inputModes: ['application/json', 'text/plain'],
            outputModes: ['application/json'],
          },
          {
            id: 'risk_scoring',
            name: 'Risk Scoring',
            description: 'Calculates risk scores for transactions and activities',
            tags: ['risk', 'scoring', 'fraud'],
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
        
        console.log('Creating fraud detection task:', taskId);
        console.log('Task input:', body);

        // Store task in memory (in production, use KV or D1)
        const task = {
          id: taskId,
          status: 'submitted',
          input: body,
          createdAt: new Date().toISOString(),
        };

        // Process fraud detection using Venice AI
        const result = await processFraudDetection(body.task?.input, env.VENICE_API_KEY);
        
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
          riskScore: 0.3,
          anomalies: [],
          recommendations: []
        }
      };

      return new Response(JSON.stringify(task), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response
    return new Response(JSON.stringify({ 
      message: 'Fraud Detection Agent Worker',
      endpoints: ['/health', '/card', '/tasks']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Venice AI fraud detection processing function
async function processFraudDetection(input, apiKey) {
  console.log('Processing fraud detection with Venice AI...');
  console.log('Input:', input);
  console.log('API Key:', apiKey ? 'Present' : 'Missing');
  
  if (!input) {
    throw new Error('No input provided for fraud detection');
  }

  // Determine the skill to use based on input
  const skill = input.skill || 'anomaly_detection';
  const transaction = input.transaction || input.data || input;
  const userHistory = input.userHistory || input.history || [];
  const context = input.context || 'transaction';
  
  let systemPrompt, userPrompt;
  
  if (skill === 'risk_scoring') {
    systemPrompt = 'You are an expert fraud detection specialist and risk analyst. Analyze transaction data and user behavior to calculate risk scores and identify potential fraud indicators. Return your analysis as JSON with the following format: {"riskScore": 0.85, "riskLevel": "high|medium|low", "indicators": ["indicator1", "indicator2"], "recommendations": ["action1", "action2"], "confidence": 0.92, "reasoning": "detailed explanation"}.';
    userPrompt = `Calculate risk score for this ${context}:\n\nTransaction: ${JSON.stringify(transaction)}\nUser History: ${JSON.stringify(userHistory)}`;
  } else {
    systemPrompt = 'You are an expert fraud detection specialist focusing on anomaly detection. Analyze patterns and behaviors to identify unusual activities that may indicate fraud. Return your analysis as JSON with the following format: {"anomalies": [{"type": "anomaly_type", "severity": "high|medium|low", "description": "anomaly description", "confidence": 0.95}], "overallRisk": "high|medium|low", "recommendations": ["action1", "action2"], "reasoning": "detailed explanation"}.';
    userPrompt = `Detect anomalies in this ${context} data:\n\nData: ${JSON.stringify(transaction)}\nHistorical Context: ${JSON.stringify(userHistory)}`;
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
      max_tokens: 2500,
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
  
  const result = data.choices[0]?.message?.content || 'Fraud detection failed';
  
  console.log('Fraud detection result:', result.substring(0, 200) + '...');
  
  // Try to parse JSON result
  try {
    const parsedResult = JSON.parse(result);
    return {
      ...parsedResult,
      skill: skill,
      analyzedData: transaction,
      context: context
    };
  } catch {
    return {
      riskScore: 0.5,
      anomalies: [],
      recommendations: [],
      reasoning: result,
      skill: skill,
      analyzedData: transaction
    };
  }
}
