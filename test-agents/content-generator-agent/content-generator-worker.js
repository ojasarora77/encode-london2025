// Cloudflare Worker version of the AI Content Generator Agent
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
      return new Response(JSON.stringify({ status: 'ok', service: 'content-generator-agent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Agent card endpoint
    if (url.pathname === '/card' || url.pathname === '/.well-known/agent-card.json') {
      const agentCard = {
        name: 'AI Content Generator',
        description: 'Generates high-quality content for blogs, social media, and marketing materials',
        url: 'https://agents.example.com/content-generator',
        provider: {
          organization: 'ContentAI',
          url: 'https://example.com/contentai',
        },
        version: '4.0.1',
        capabilities: {
          streaming: true,
          pushNotifications: false,
          stateTransitionHistory: true,
        },
        defaultInputModes: ['text/plain', 'application/json'],
        defaultOutputModes: ['text/plain', 'text/markdown', 'application/json'],
        skills: [
          {
            id: 'blog_writing',
            name: 'Blog Writing',
            description: 'Creates engaging blog posts and articles',
            tags: ['writing', 'content', 'blog'],
            inputModes: ['text/plain', 'application/json'],
            outputModes: ['text/plain', 'text/markdown'],
          },
          {
            id: 'social_media',
            name: 'Social Media Content',
            description: 'Generates social media posts and captions',
            tags: ['social-media', 'content', 'marketing'],
            inputModes: ['text/plain', 'application/json'],
            outputModes: ['text/plain', 'application/json'],
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
        
        console.log('Creating content generation task:', taskId);
        console.log('Task input:', body);

        // Store task in memory (in production, use KV or D1)
        const task = {
          id: taskId,
          status: 'submitted',
          input: body,
          createdAt: new Date().toISOString(),
        };

        // Process content generation using Venice AI
        const result = await processContentGeneration(body.task?.input, env.VENICE_API_KEY);
        
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
          content: 'Generated content would be here',
          wordCount: 500,
          format: 'markdown'
        }
      };

      return new Response(JSON.stringify(task), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response
    return new Response(JSON.stringify({ 
      message: 'AI Content Generator Agent Worker',
      endpoints: ['/health', '/card', '/tasks']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Venice AI content generation processing function
async function processContentGeneration(input, apiKey) {
  console.log('Processing content generation with Venice AI...');
  console.log('Input:', input);
  console.log('API Key:', apiKey ? 'Present' : 'Missing');
  
  if (!input) {
    throw new Error('No input provided for content generation');
  }

  // Determine the skill to use based on input
  const skill = input.skill || 'blog_writing';
  const topic = input.topic || input.text || input;
  const tone = input.tone || 'professional';
  const length = input.length || 'medium';
  
  let systemPrompt, userPrompt;
  
  if (skill === 'social_media') {
    systemPrompt = 'You are a social media content expert. Create engaging, concise social media posts that capture attention and drive engagement. Include relevant hashtags and emojis where appropriate. Keep posts platform-appropriate (Twitter: 280 chars, Instagram: engaging caption, LinkedIn: professional).';
    userPrompt = `Create a ${input.platform || 'general'} social media post about: "${topic}"\nTone: ${tone}\nTarget audience: ${input.audience || 'general'}`;
  } else {
    systemPrompt = 'You are a professional content writer and blogger. Create high-quality, engaging blog posts and articles that are well-structured, informative, and optimized for readability. Use markdown formatting for headings, lists, and emphasis.';
    userPrompt = `Write a ${length} blog post about: "${topic}"\nTone: ${tone}\nTarget audience: ${input.audience || 'general readers'}\n${input.keywords ? `Keywords to include: ${input.keywords}` : ''}`;
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
      max_tokens: skill === 'social_media' ? 500 : 3000,
      temperature: 0.7
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
  
  const content = data.choices[0]?.message?.content || 'Content generation failed';
  
  console.log('Generated content:', content.substring(0, 200) + '...');
  
  return {
    content: content,
    skill: skill,
    topic: topic,
    tone: tone,
    wordCount: content.split(/\s+/).length,
    format: skill === 'blog_writing' ? 'markdown' : 'text'
  };
}
