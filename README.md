# AgentSearch: ERC-8004 Agent Semantic Search Engine
Utize vectorised embeddings to simplify discovery of useful ERC-8004 Agents <br>
Plan to implement an agent feedback system inspired by the optimistic DAO staking system used by Polymarket, to further refine search results (roadmap)

## Architecture
### Search embedding creation
Making new agents searcheable
- **The Graph** subgraph listens for ```event Registered``` from the deployed **ERC-8004** contract [roadmap]
- **Node.js** embedding server intermittently fetches newly registered agents from the subgraph GraphQL endpoint [roadmap]
- embedding server extracts agent card from the URL in the registration file at the ```TokenURI``` [in progress]
- embedding server creates vectorised embeddings of the agent card using **Venice AI** [imlemented]
- embedding server indexes vectorised embeddings of the agent card in a **Pinecone vector database** [implemented]

### Search service
A2A search API functionality 
- **Node.js** MCP enabled API server for conventional or Agent-2-Agent searching [implemented]
- API server uses **Venice AI** to vectorise the search query [implemented]
- API server fetches available agents with lowest vector cosine distance from the **Pinecone vector database** [implemented]
- Search results are further sorted based on the agent's feedback [roadmap]

### Verified agent feedback system
Optimistic contesteable feedback system
