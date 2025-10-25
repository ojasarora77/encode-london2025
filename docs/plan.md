# Agent Registry Integration Plan

## Overview
This document outlines the plan for Ojas to implement agent-to-agent communication using our Agent Registry Vector Search system. The goal is to enable seamless communication between agents after they've been discovered through semantic search.

**Important**: This will be implemented as a proper MCP (Model Context Protocol) server, so plan accordingly for MCP integration patterns.

## Current System Status ✅
- **Agent Registry**: Fully operational with Venice AI embeddings and Pinecone vector search
- **Semantic Search**: Working with 85-90% accuracy for agent discovery
- **API Endpoints**: Available at `http://localhost:3001/api/agents/search`
- **Sample Agents**: 15 diverse agents indexed and searchable

## Implementation Plan for Ojas

### Phase 1: Agent Discovery & Registry Integration 🔍

#### 1.1 Integrate with Agent Registry
- **Task**: Connect your agent to our search API
- **Endpoint**: `POST http://localhost:3001/api/agents/search`
- **Implementation**: 
  ```typescript
  const searchAgents = async (query: string) => {
    const response = await fetch('http://localhost:3001/api/agents/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 5 })
    });
    return response.json();
  };
  ```

#### 1.2 Agent Selection Logic
- **Task**: Implement logic to select the best agent from search results
- **Criteria**: 
  - Score threshold (e.g., >0.6 for high confidence)
  - Capability matching
  - Input/output mode compatibility

## 🎯 **FOCUS: Post-Agent Selection Implementation**

**This is the critical part - what happens AFTER an agent is selected from the registry:**

### Phase 2: Post-Selection Agent Communication 🤝

#### 2.1 MCP Server Architecture
- **Task**: Design MCP server for agent communication
- **Key Components**:
  - MCP server implementation
  - Agent connection management
  - Message routing system
  - Response handling

#### 2.2 Agent Connection Establishment
- **Task**: Connect to selected agent after discovery
- **Implementation**:
  ```typescript
  // After agent selection from registry
  const connectToAgent = async (selectedAgent: AgentResult) => {
    // 1. Validate agent endpoint
    // 2. Establish MCP connection
    // 3. Authenticate if required
    // 4. Initialize communication session
  };
  ```

#### 2.3 Agent Communication Protocol
- **Task**: Implement communication with discovered agent
- **Requirements**:
  - MCP message format compliance
  - Request/response handling
  - Error management
  - Session persistence

### Phase 3: MCP Server Implementation 🛠️

#### 3.1 MCP Server Setup
- **Task**: Create MCP server for agent communication
- **Implementation**:
  ```typescript
  // MCP Server for agent communication
  const mcpServer = new MCPServer({
    name: "agent-communication-server",
    version: "1.0.0",
    tools: [
      {
        name: "communicate_with_agent",
        description: "Communicate with discovered agent",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string" },
            message: { type: "string" },
            context: { type: "object" }
          }
        }
      }
    ]
  });
  ```

#### 3.2 Agent Communication Flow
- **Task**: Implement the communication workflow
- **Flow**:
  1. **Agent Discovery** → Search registry for relevant agents
  2. **Agent Selection** → Choose best match based on criteria
  3. **Connection** → Establish MCP connection to selected agent
  4. **Communication** → Send requests and handle responses
  5. **Result Processing** → Format and return results to user

#### 3.3 Error Handling & Fallbacks
- **Task**: Implement robust error handling
- **Scenarios**:
  - Agent unavailable
  - Communication timeout
  - Protocol mismatch
  - Authentication failure

### Phase 4: MCP Integration & Testing 🧪

#### 4.1 MCP Server Deployment
- **Task**: Deploy MCP server for agent communication
- **Requirements**:
  - MCP server configuration
  - Agent registry integration
  - Communication protocols
  - Error handling

#### 4.2 End-to-End Workflow Testing
- **Task**: Test complete agent communication workflow
- **Flow**:
  1. **User Query** → "I need to extract invoice data"
  2. **Agent Discovery** → Search registry → Find "Invoice Extraction Agent"
  3. **Agent Selection** → Select best match (score > 0.6)
  4. **MCP Connection** → Connect to selected agent via MCP
  5. **Communication** → Send request, receive response
  6. **Result Return** → Format and return to user

#### 4.3 Testing Strategy
- **Unit Tests**: MCP server components
- **Integration Tests**: Agent registry → MCP communication
- **End-to-End Tests**: Complete user workflow

## Technical Requirements

### Dependencies
- **Agent Registry API**: Already available
- **MCP Server Libraries**: `@modelcontextprotocol/sdk`
- **Agent Communication**: HTTP/WebSocket for agent endpoints
- **Error Handling**: Retry logic, fallback mechanisms

### Architecture Components
```
User Query
    ↓
Agent Registry Search
    ↓
Agent Selection
    ↓
MCP Server Connection
    ↓
Agent Communication
    ↓
Response to User
```

### MCP Server Implementation
```typescript
// Core MCP server for agent communication
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: "agent-communication-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// Tool for communicating with discovered agents
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "communicate_with_agent",
    description: "Communicate with a discovered agent",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "ID of the agent to communicate with" },
        message: { type: "string", description: "Message to send to the agent" },
        context: { type: "object", description: "Additional context for the agent" }
      },
      required: ["agentId", "message"]
    }
  }]
}));
```

## Success Criteria

### Phase 1 Success ✅
- [ ] Agent can search registry via API
- [ ] Agent selection logic works
- [ ] Integration with existing system

### Phase 2 Success
- [ ] MCP server architecture designed
- [ ] Agent connection establishment working
- [ ] Communication protocol implemented

### Phase 3 Success
- [ ] MCP server fully implemented
- [ ] Agent communication flow working
- [ ] Error handling and fallbacks in place

### Phase 4 Success
- [ ] End-to-end workflow functional
- [ ] MCP server deployed and tested
- [ ] Production ready

## Resources & Documentation

### Agent Registry
- **API Docs**: Available in `/agent-registry/README.md`
- **Sample Agents**: 15 agents in `/agent-registry/data/sample-agents.json`
- **Search Examples**: See test results above

### MCP Server Development
- **MCP SDK**: [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- **Documentation**: [MCP Specification](https://modelcontextprotocol.io)
- **Examples**: Research existing MCP server implementations

### Agent Communication
- **HTTP APIs**: Standard REST/GraphQL endpoints
- **WebSocket**: Real-time communication
- **Authentication**: API keys, OAuth, or custom auth
- **Message Formats**: JSON, Protocol Buffers, etc.

## Next Steps for Ojas

1. **Start with Phase 1**: Integrate with Agent Registry API
2. **Research MCP Server**: Understand MCP server implementation patterns
3. **Study Agent Communication**: Research how to communicate with discovered agents
4. **Prototype MCP Server**: Build minimal MCP server for agent communication
5. **Implement Post-Selection Flow**: Focus on what happens after agent selection
6. **Test End-to-End**: Complete workflow from discovery to communication

## Support & Questions

- **Agent Registry Issues**: Check `/agent-registry/README.md`
- **API Problems**: Test with `npm run index-agents`
- **Integration Help**: Review sample agents and search results
- **Protocol Questions**: Research ERC-8004 and A2A documentation

---

**Goal**: Enable seamless agent-to-agent communication through semantic discovery and MCP server implementation.

**Timeline**: Implement in phases, starting with Agent Registry integration and building up to full MCP-based agent communication.

**Key Focus**: The critical part is what happens AFTER an agent is selected from the registry - this is where the MCP server comes in to facilitate communication with the discovered agent.
