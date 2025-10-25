const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function testPinecone() {
  try {
    console.log('Testing Pinecone connection...');
    console.log('API Key:', process.env.PINECONE_API_KEY ? 'Set' : 'Not set');
    console.log('Environment:', process.env.PINECONE_ENVIRONMENT);
    console.log('Index Name:', process.env.PINECONE_INDEX_NAME);
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT
    });
    
    console.log('Pinecone client created successfully');
    
    const indexes = await pinecone.listIndexes();
    console.log('Available indexes:', indexes);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

testPinecone();
