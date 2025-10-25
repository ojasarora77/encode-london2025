# CompassDAO: ERC-8004 Agent Semantic Search Engine
Utize vectorised embeddings to simplify discovery of useful ERC-8004 Agents <br>
Plan to implement an agent feedback system inspired by the optimistic DAO staking system used by Polymarket, to further refine search results (roadmap)

## Architecture
### Search embedding creation
Making new agents searcheable
- **The Graph** subgraph listens for ```event Registered``` from the **ERC-8004** contract deployed on **Arbitrum** (currently using test deployment on **Arbitrum sepolia**) [roadmap]
- Scheduled **CloudFlare worker** intermittently fetches newly registered agents from the subgraph GraphQL endpoint [roadmap]
- Worker extracts agent card from the URL in the registration file at the ```TokenURI``` [in progress]
- Worker creates vectorised embeddings of the agent card using **Venice AI** [imlemented]
- Worker indexes vectorised embeddings of the agent card in a **Pinecone vector database** [implemented]

### Search service
A2A search API functionality 
- **CloudFlare worker** serverless MCP enabled **Agent-2-Agent** search API using **x402** to pay for searches [implemented]
- Worker uses **Venice AI** to vectorise the search query [implemented]
- Worker fetches available agents with lowest vector cosine distance from the **Pinecone vector database** [implemented]
- Worker computes a **trust score** for each agent using information from the **ERC-8004 Reputation Registry** [implemented]
- Search results are further sorted based **CompassDAO verification** [roadmap]

### Frontend & demo
Used for documentation and demo
- Website hosted on **vercel** [implemented]
- Demo "agents" (models with sysprompts) running on **Cloudflare workers** [implemented]
- Access to demonstrate manual semantic agent search [implemented]
- Chat bot to demonstrate A2A semantic agent search [implemented]

### Verified agent feedback system [roadmap]
Optimistic contestable feedback system
- **DAO** verified agents recieve a higher trust score [roadmap]
- Optimistic verification system assumes reviews of DAO member agents are legitimate [in progress]
- DAO members can propose a review as illegitimate by staking tokens against the review. After 24 hours the review will be marked as revoked and the staked tokens will be returned [in progress]
- The proposal can be contested with an equal stake from another DAO member, triggering a vote in which the staked tokens go to the winner
- This economically incentivises honest reviewing

``` mermaid
graph TB
    %% Define styles
    classDef implemented fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef roadmap fill:#fff3e0,stroke:#e65100,stroke-width:2px,stroke-dasharray: 5 5
    classDef arbitrum fill:#bbdefb,stroke:#1976d2,stroke-width:3px
    classDef x402 fill:#c8e6c9,stroke:#388e3c,stroke-width:3px
    classDef a2a fill:#ffe0b2,stroke:#f57c00,stroke-width:3px

    %% Frontend Layer
    subgraph Frontend["🌐 Frontend & Demo"]
        Website["Website<br/>(Vercel)"]
        Chatbot["Chatbot<br/>(A2A Demo)"]
        DemoAgents["Demo Agents<br/>(Cloudflare Workers)"]
    end

    %% Search API Layer
    subgraph SearchAPI["🔍 Search API (A2A + x402)"]
        MCPWorker["Cloudflare Worker<br/>MCP Server"]
        Pinecone["Pinecone<br/>(Vector Database)"]
        TrustScore["Trust Score<br/>Computation"]
    end

    %% Indexing Pipeline
    subgraph Indexing["📊 Indexing Pipeline"]
        GraphSubgraph["The Graph<br/>Subgraph"]
        Scheduler["Scheduled<br/> Cloudflare Worker"]
        AgentExtractor["Agent Card<br/>Extractor"]
        EmbeddingService["Venice AI<br/>(Embeddings)"]
        VectorIndexer["Pinecone<br/>Indexer"]
        VeniceAI["Venice AI<br/>(Query Vectorization)"]
    end

    %% Blockchain Layer
    subgraph Blockchain["⛓️ Arbitrum Sepolia"]
        ERC8004Identity["ERC-8004<br/>Identity Registry"]
        ERC8004Reputation["ERC-8004<br/>Reputation Registry"]
        FeedbackMarket["FeedbackMarket<br/>(DAO Staking)"]
    end

    %% Data Flows
    Website --> MCPWorker
    Chatbot --> MCPWorker
    DemoAgents --> MCPWorker

    MCPWorker --> VeniceAI
    MCPWorker --> Pinecone
    MCPWorker --> TrustScore
    MCPWorker --> ERC8004Reputation

    GraphSubgraph --> Scheduler
    Scheduler --> AgentExtractor
    AgentExtractor --> EmbeddingService
    EmbeddingService --> VectorIndexer
    VectorIndexer --> Pinecone

    ERC8004Identity --> GraphSubgraph
    ERC8004Reputation --> TrustScore
    FeedbackMarket --> ERC8004Reputation

    %% Apply styles
    class Website,Chatbot,DemoAgents,MCPWorker,VeniceAI,Pinecone,TrustScore,AgentExtractor,EmbeddingService,VectorIndexer implemented
    class GraphSubgraph,Scheduler,FeedbackMarket roadmap
    class ERC8004Identity,ERC8004Reputation,FeedbackMarket arbitrum
    class MCPWorker x402
    class Chatbot,MCPWorker a2a
```