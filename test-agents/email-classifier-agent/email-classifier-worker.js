// Cloudflare Worker version of the Email Classification Agent
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
      return new Response(JSON.stringify({ status: 'ok', service: 'email-classifier-agent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Agent card endpoint
    if (url.pathname === '/card' || url.pathname === '/.well-known/agent-card.json') {
      const agentCard = {
        name: 'Email Classification Agent',
        description: 'Automatically classifies emails by category, priority, and sentiment',
        url: 'https://agents.example.com/email-classifier',
        provider: {
          organization: 'EmailAI',
          url: 'https://example.com/emailai',
        },
        version: '1.3.0',
        capabilities: {
          streaming: true,
          pushNotifications: false,
          stateTransitionHistory: true,
        },
        defaultInputModes: ['text/plain', 'application/json'],
        defaultOutputModes: ['application/json', 'text/plain'],
        skills: [
          {
            id: 'email_classification',
            name: 'Email Classification',
            description: 'Categorizes emails by type and importance',
            tags: ['email', 'classification', 'nlp'],
            inputModes: ['text/plain', 'application/json'],
            outputModes: ['application/json'],
          },
          {
            id: 'spam_detection',
            name: 'Spam Detection',
            description: 'Identifies and filters spam emails',
            tags: ['spam', 'security', 'filtering'],
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
        
        console.log('Creating email classification task:', taskId);
        console.log('Task input:', body);

        // Store task in memory (in production, use KV or D1)
        const task = {
          id: taskId,
          status: 'submitted',
          input: body,
          createdAt: new Date().toISOString(),
        };

        // Process email classification using Venice AI
        const result = await processEmailClassification(body.task?.input, env.VENICE_API_KEY);
        
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
          category: 'work',
          isSpam: false,
          priority: 'medium'
        }
      };

      return new Response(JSON.stringify(task), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response
    return new Response(JSON.stringify({ 
      message: 'Email Classification Agent Worker',
      endpoints: ['/health', '/card', '/tasks']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Venice AI email classification processing function
async function processEmailClassification(input, apiKey) {
  console.log('Processing email classification with Venice AI...');
  console.log('Input:', input);
  console.log('API Key:', apiKey ? 'Present' : 'Missing');
  
  if (!input) {
    throw new Error('No input provided for email classification');
  }

  // Determine the skill to use based on input
  const skill = input.skill || 'email_classification';
  const emailSubject = input.subject || '';
  const emailBody = input.body || input.text || input;
  const emailFrom = input.from || '';
  
  let systemPrompt, userPrompt;
  
  if (skill === 'spam_detection') {
    systemPrompt = 'You are an expert spam detection system. Analyze the email for spam indicators such as suspicious links, phishing attempts, urgency tactics, poor grammar, suspicious sender addresses, and common spam patterns. Return your analysis as JSON with the following format: {"isSpam": true, "confidence": 0.95, "spamScore": 8.5, "indicators": ["suspicious links", "urgency tactics"], "reasoning": "detailed explanation"}.';
    userPrompt = `Analyze this email for spam:\n\nFrom: ${emailFrom}\nSubject: ${emailSubject}\nBody: ${emailBody}`;
  } else {
    systemPrompt = 'You are an expert email classification system. Categorize the email by type (work, personal, promotional, social, financial, travel, etc.), priority (low, medium, high, urgent), and sentiment. Return your analysis as JSON with the following format: {"category": "work", "priority": "high", "sentiment": "neutral", "requiresAction": true, "suggestedFolder": "Important", "confidence": 0.90, "summary": "brief summary"}.';
    userPrompt = `Classify this email:\n\nFrom: ${emailFrom}\nSubject: ${emailSubject}\nBody: ${emailBody}`;
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
  
  const result = data.choices[0]?.message?.content || 'Classification failed';
  
  console.log('Email classification result:', result.substring(0, 200) + '...');
  
  // Try to parse JSON result
  try {
    const parsedResult = JSON.parse(result);
    return {
      ...parsedResult,
      skill: skill,
      emailSubject: emailSubject,
      emailFrom: emailFrom
    };
  } catch {
    return {
      classification: result,
      category: 'unknown',
      isSpam: false,
      skill: skill,
      emailSubject: emailSubject,
      emailFrom: emailFrom
    };
  }
}
