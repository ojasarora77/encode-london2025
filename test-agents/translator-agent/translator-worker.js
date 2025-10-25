// Cloudflare Worker version of the Multi-Language Translator Agent
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
      return new Response(JSON.stringify({ status: 'ok', service: 'translator-agent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Agent card endpoint
    if (url.pathname === '/card' || url.pathname === '/.well-known/agent-card.json') {
      const agentCard = {
        name: 'Multi-Language Translator',
        description: 'Translates text between 50+ languages with context awareness and cultural adaptation',
        url: 'https://agents.example.com/translator',
        provider: {
          organization: 'LinguaFlow',
          url: 'https://example.com/linguaflow',
        },
        version: '3.1.0',
        capabilities: {
          streaming: true,
          pushNotifications: false,
          stateTransitionHistory: true,
        },
        defaultInputModes: ['text/plain', 'application/json'],
        defaultOutputModes: ['text/plain', 'application/json'],
        skills: [
          {
            id: 'translate_text',
            name: 'Text Translation',
            description: 'Translates text while preserving context and cultural nuances',
            tags: ['translation', 'nlp', 'multilingual'],
            inputModes: ['text/plain', 'application/json'],
            outputModes: ['text/plain', 'application/json'],
          },
          {
            id: 'detect_language',
            name: 'Language Detection',
            description: 'Automatically detects source language for translation',
            tags: ['language', 'detection', 'nlp'],
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
        
        console.log('Creating translation task:', taskId);
        console.log('Task input:', body);

        // Store task in memory (in production, use KV or D1)
        const task = {
          id: taskId,
          status: 'submitted',
          input: body,
          createdAt: new Date().toISOString(),
        };

        // Process translation using Venice AI
        const result = await processTranslation(body.task?.input, env.VENICE_API_KEY);
        
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
          translatedText: 'Translation would be here',
          detectedLanguage: 'en',
          confidence: 0.95
        }
      };

      return new Response(JSON.stringify(task), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response
    return new Response(JSON.stringify({ 
      message: 'Multi-Language Translator Agent Worker',
      endpoints: ['/health', '/card', '/tasks']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Venice AI translation processing function
async function processTranslation(input, apiKey) {
  console.log('Processing translation with Venice AI...');
  console.log('Input:', input);
  console.log('API Key:', apiKey ? 'Present' : 'Missing');
  
  if (!input) {
    throw new Error('No input provided for translation');
  }

  // Determine the skill to use based on input
  const skill = input.skill || 'translate_text';
  const text = input.text || input;
  
  let systemPrompt, userPrompt;
  
  if (skill === 'detect_language') {
    systemPrompt = 'You are a language detection expert. Analyze the provided text and determine the language it is written in. Return your response as JSON with the following format: {"language": "language_name", "confidence": 0.95, "code": "en"}.';
    userPrompt = `Detect the language of this text: "${text}"`;
  } else {
    systemPrompt = 'You are a professional translator with expertise in 50+ languages. Translate the provided text while preserving context, cultural nuances, and meaning. If a target language is specified, translate to that language. If no target language is specified, translate to English. Return the translation in the same format as the input.';
    userPrompt = `Translate this text: "${text}"${input.targetLanguage ? ` to ${input.targetLanguage}` : ''}`;
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
  
  const result = data.choices[0]?.message?.content || 'Translation failed';
  
  console.log('Translation result:', result.substring(0, 100) + '...');
  
  // Parse result based on skill
  if (skill === 'detect_language') {
    try {
      return JSON.parse(result);
    } catch {
      return {
        language: 'unknown',
        confidence: 0.5,
        code: 'unknown',
        rawResult: result
      };
    }
  } else {
    return {
      translatedText: result,
      originalText: text,
      targetLanguage: input.targetLanguage || 'English',
      skill: skill
    };
  }
}
