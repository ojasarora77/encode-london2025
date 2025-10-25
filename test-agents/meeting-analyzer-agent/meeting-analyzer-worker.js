// Cloudflare Worker version of the Meeting Analysis Agent
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
      return new Response(JSON.stringify({ status: 'ok', service: 'meeting-analyzer-agent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Agent card endpoint
    if (url.pathname === '/card' || url.pathname === '/.well-known/agent-card.json') {
      const agentCard = {
        name: 'Meeting Analysis Agent',
        description: 'Analyzes meeting transcripts, extracts action items, and generates summaries',
        url: 'https://agents.example.com/meeting-analyzer',
        provider: {
          organization: 'MeetingAI',
          url: 'https://example.com/meetingai',
        },
        version: '2.2.0',
        capabilities: {
          streaming: true,
          pushNotifications: false,
          stateTransitionHistory: true,
        },
        defaultInputModes: ['text/plain', 'application/json'],
        defaultOutputModes: ['application/json', 'text/markdown'],
        skills: [
          {
            id: 'action_items',
            name: 'Action Item Extraction',
            description: 'Identifies and extracts action items from meetings',
            tags: ['meeting', 'action-items', 'extraction'],
            inputModes: ['text/plain', 'application/json'],
            outputModes: ['application/json', 'text/markdown'],
          },
          {
            id: 'meeting_summary',
            name: 'Meeting Summary',
            description: 'Generates concise meeting summaries',
            tags: ['meeting', 'summary', 'nlp'],
            inputModes: ['text/plain', 'application/json'],
            outputModes: ['text/markdown', 'application/json'],
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
        
        console.log('Creating meeting analysis task:', taskId);
        console.log('Task input:', body);

        // Store task in memory (in production, use KV or D1)
        const task = {
          id: taskId,
          status: 'submitted',
          input: body,
          createdAt: new Date().toISOString(),
        };

        // Process meeting analysis using Venice AI
        const result = await processMeetingAnalysis(body.task?.input, env.VENICE_API_KEY);
        
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
          summary: 'Meeting summary would be here',
          actionItems: [],
          participants: []
        }
      };

      return new Response(JSON.stringify(task), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response
    return new Response(JSON.stringify({ 
      message: 'Meeting Analysis Agent Worker',
      endpoints: ['/health', '/card', '/tasks']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Venice AI meeting analysis processing function
async function processMeetingAnalysis(input, apiKey) {
  console.log('Processing meeting analysis with Venice AI...');
  console.log('Input:', input);
  console.log('API Key:', apiKey ? 'Present' : 'Missing');
  
  if (!input) {
    throw new Error('No input provided for meeting analysis');
  }

  // Determine the skill to use based on input
  const skill = input.skill || 'meeting_summary';
  const transcript = input.transcript || input.text || input;
  
  let systemPrompt, userPrompt;
  
  if (skill === 'action_items') {
    systemPrompt = 'You are an expert meeting analyst specializing in extracting action items. Analyze the meeting transcript and identify all action items, tasks, and commitments made. Return your analysis as JSON with the following format: {"actionItems": [{"task": "task description", "assignee": "person name", "deadline": "deadline if mentioned", "priority": "high|medium|low", "status": "pending"}], "totalItems": 5}.';
    userPrompt = `Extract action items from this meeting transcript:\n\n${transcript}`;
  } else {
    systemPrompt = 'You are an expert meeting analyst. Create a concise, well-structured summary of the meeting that captures key points, decisions made, topics discussed, and important outcomes. Format the summary in markdown with clear sections.';
    userPrompt = `Summarize this meeting transcript:\n\n${transcript}`;
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
  
  const result = data.choices[0]?.message?.content || 'Meeting analysis failed';
  
  console.log('Meeting analysis result:', result.substring(0, 200) + '...');
  
  // Try to parse JSON result for action items, fallback to text for summary
  if (skill === 'action_items') {
    try {
      const parsedResult = JSON.parse(result);
      return {
        ...parsedResult,
        skill: skill,
        transcriptLength: transcript.length
      };
    } catch {
      return {
        actionItems: [],
        totalItems: 0,
        rawAnalysis: result,
        skill: skill,
        transcriptLength: transcript.length
      };
    }
  } else {
    return {
      summary: result,
      skill: skill,
      transcriptLength: transcript.length,
      format: 'markdown'
    };
  }
}
