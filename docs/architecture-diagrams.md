# CompassDAO Architecture Diagrams

This document contains comprehensive architecture diagrams for the CompassDAO ERC-8004 Agent Semantic Search Engine, highlighting the integration of Arbitrum blockchain, Agent-to-Agent (A2A) search functionality, and x402 payment protocol.

## Legend

- **🟢 Implemented Features**: Solid borders, standard colors
- **🟡 Roadmap Features**: Dashed borders, muted colors  
- **🔵 Arbitrum Integration**: Blue/purple highlighting
- **🟢 x402 Payment Flows**: Green highlighting
- **🟠 A2A Interactions**: Orange highlighting

---

## Diagram 1: High-Level System Overview

This diagram shows the main system components, data flows, and key technologies with clear visual distinction between implemented and roadmap features.

> **📁 View the diagram**: Open `architecture-diagrams.mmd` in a Mermaid editor or use the online Mermaid Live Editor

**How to view this diagram:**
1. **Online**: Copy the content from `docs/architecture-diagrams.mmd` and paste it into [Mermaid Live Editor](https://mermaid.live/)
2. **VS Code**: Install the "Mermaid Preview" extension and open the `.mmd` file
3. **GitHub**: The `.mmd` files will render automatically in GitHub's markdown preview

---

## Diagram 2: Detailed Technical Architecture

This comprehensive diagram shows specific contract interactions, API endpoints, x402 payment flow, trust score calculation, and all service layers.

> **📁 View the diagram**: Open `architecture-diagrams-detailed.mmd` in a Mermaid editor or use the online Mermaid Live Editor

**How to view this diagram:**
1. **Online**: Copy the content from `docs/architecture-diagrams-detailed.mmd` and paste it into [Mermaid Live Editor](https://mermaid.live/)
2. **VS Code**: Install the "Mermaid Preview" extension and open the `.mmd` file
3. **GitHub**: The `.mmd` files will render automatically in GitHub's markdown preview

---

## Key Architectural Decisions

### 1. **Arbitrum Integration**
- **ERC-8004 Identity Registry**: NFT-based agent registration with metadata URI
- **ERC-8004 Reputation Registry**: On-chain feedback system with cryptographic authorization
- **USDC Payments**: x402 payments processed on Arbitrum Sepolia testnet
- **DAO Governance**: AGTC token for voting and staking in feedback disputes

### 2. **Agent-to-Agent (A2A) Search**
- **MCP Protocol**: Model Context Protocol for standardized agent communication
- **x402 Payments**: Pay-per-use semantic search ($0.01 USDC per query)
- **EIP-712 Signatures**: Cryptographic payment authorization
- **Serverless Architecture**: Cloudflare Workers for global edge distribution

### 3. **Trust Score Calculation**
- **Multi-factor Scoring**: Identity verification, economic backing, DAO verification, review diversity
- **ERC-8004 Integration**: Leverages external reputation registry for trustless scoring
- **DAO Verification**: Higher trust scores for DAO-verified agents
- **Optimistic Staking**: Economic incentives for honest reviewing

### 4. **Vector Search Pipeline**
- **Venice AI**: High-accuracy embeddings using text-embedding-bge-m3 model
- **Pinecone**: Vector database for similarity search with metadata filtering
- **Batch Processing**: Efficient indexing of multiple agents
- **Real-time Search**: Sub-second query response times

### 5. **Roadmap Features**
- **The Graph Integration**: Automated agent discovery from blockchain events
- **DAO Feedback System**: Optimistic oracle for agent reviews with economic incentives
- **CompassDAO Verification**: Enhanced trust scoring for DAO-verified agents

---

## Implementation Status

| Component | Status | Description |
|-----------|--------|-------------|
| **Frontend & Demo** | ✅ Implemented | Vercel-hosted website with chatbot |
| **A2A Search API** | ✅ Implemented | MCP server with x402 payments |
| **Vector Search** | ✅ Implemented | Venice AI + Pinecone integration |
| **Trust Scoring** | ✅ Implemented | ERC-8004 reputation integration |
| **The Graph Subgraph** | 🟡 Roadmap | Automated agent discovery |
| **DAO Feedback System** | 🟡 Roadmap | Optimistic staking for reviews |
| **CompassDAO Verification** | 🟡 Roadmap | Enhanced trust scoring |

---

*This architecture enables trustless, paid semantic search for ERC-8004 agents with economic incentives for honest feedback and DAO-governed verification.*
