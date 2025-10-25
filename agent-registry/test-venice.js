require('dotenv').config();

async function testVeniceAPI() {
  try {
    console.log('Testing Venice AI API...');
    console.log('API Key:', process.env.VENICE_API_KEY ? 'Set' : 'Not set');
    
    const response = await fetch('https://api.venice.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VENICE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: 'This is a test',
        model: 'text-embedding-bge-m3',
        encoding_format: 'float'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    } else {
      const data = await response.json();
      console.log('Success! Response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testVeniceAPI();
