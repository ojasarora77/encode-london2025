import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { indexerService } from '../index';
import { SearchFilters } from '../types/agentcard.types';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'agent-registry'
  });
});

// Search agents endpoint
app.post('/api/agents/search', async (req, res) => {
  try {
    const { query, limit = 5, filters } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Query is required and must be a string' 
      });
    }
    
    if (limit && (typeof limit !== 'number' || limit < 1 || limit > 50)) {
      return res.status(400).json({ 
        error: 'Limit must be a number between 1 and 50' 
      });
    }
    
    // Validate filters if provided
    if (filters) {
      const validFilters: SearchFilters = {};
      
      if (filters.capabilities && Array.isArray(filters.capabilities)) {
        validFilters.capabilities = filters.capabilities;
      }
      
      if (filters.inputMode && typeof filters.inputMode === 'string') {
        validFilters.inputMode = filters.inputMode;
      }
      
      if (filters.outputMode && typeof filters.outputMode === 'string') {
        validFilters.outputMode = filters.outputMode;
      }
      
      if (filters.minScore && typeof filters.minScore === 'number') {
        validFilters.minScore = filters.minScore;
      }
      
      const results = await indexerService.searchAgents(query, limit, validFilters);
      return res.json(results);
    }
    
    const results = await indexerService.searchAgents(query, limit);
    res.json(results);
    
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get agent by ID endpoint (optional)
app.get('/api/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // This would require a separate method to get agent by ID
    // For now, return a placeholder response
    res.json({
      message: 'Agent details endpoint not implemented yet',
      agentId: id
    });
    
  } catch (error: any) {
    console.error('Get agent error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Agent Registry API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Search endpoint: POST http://localhost:${PORT}/api/agents/search`);
});

export default app;
