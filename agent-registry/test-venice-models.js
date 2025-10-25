require('dotenv').config();

async function testVeniceModels() {
  try {
    console.log('Testing Venice AI Models API...');
    console.log('API Key:', process.env.VENICE_API_KEY ? 'Set' : 'Not set');
    
    // Try to list available models first
    const modelsResponse = await fetch('https://api.venice.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VENICE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Models API status:', modelsResponse.status);
    
    if (modelsResponse.ok) {
      const models = await modelsResponse.json();
      console.log('Available models:', JSON.stringify(models, null, 2));
    } else {
      const errorText = await modelsResponse.text();
      console.log('Models API error:', errorText);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testVeniceModels();
