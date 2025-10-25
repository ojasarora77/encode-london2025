# x402 Next.js + AI Starter Kit Architecture

## High-Level Overview

The starter kit is a full-stack Next.js application designed to be a launchpad for building **autonomous AI agents that can pay for services**. It's not just a chatbot; it's a framework that integrates AI, tool usage, and a decentralized payment protocol into a cohesive system.

The core architectural pattern is **Orchestration and Agency**. The Next.js backend doesn't just "wrap" an LLM; it acts as an orchestrator that provides an AI model with a set of capabilities (tools) and a wallet, allowing the AI to decide *how* to accomplish a goal and pay for it if necessary.

---

## Architectural Components & Flow

Here’s a visual representation of the request flow:

```
+-----------------+      +----------------------+      +---------------------+
|   User's        |      |   Next.js Frontend   |      |   Next.js Backend   |
|   Browser       |----->|   (React/useChat)    |----->|  (/api/chat/route)  |
+-----------------+      +----------------------+      +----------+----------+
      ^                                                            |
      | (6. Streamed UI)                                           | (3. Inference)
      |                                                            |
+-----+-------------+      +----------------------+      +---------v---------+
|   Vercel AI SDK   |      |   AI Model           |      |   Vercel AI SDK   |
| (UI Rendering)    |<-----|   (e.g., OpenAI)     |<-----|   (streamText)    |
+-------------------+      +----------------------+      +---------+---------+
                                                                   |
                                                                   | (4. Tool Call)
+----------------------+      +----------------------+      +------v------------+
|   Coinbase CDP       |      |   Blockchain         |      |   MCP Server      |
| (Wallet Management)  |<---->|   (e.g., Base)       |<---->|   (/mcp/route)    |
+----------------------+      +----------------------+      | (with x402 Payment|
                                                             |  Middleware)      |
                                                             +-------------------+
```

---

## Detailed Component Breakdown

### 1. Frontend (The User Interface)

*   **Technology**: React, Next.js Pages, TailwindCSS.
*   **Core Logic**: `starter-kit/src/app/page.tsx`
*   **Key Library**: Vercel AI SDK's `useChat` hook.
    *   This hook manages the entire state of the chat interface: the list of messages, user input, and loading status.
    *   When the user sends a message, `useChat` makes a `POST` request to the backend API endpoint (`/api/chat`).
    *   It is built to receive a streaming response, which it uses to render the AI's message token-by-token, providing a real-time experience.
*   **AI Elements**: The UI is built with components from `starter-kit/src/components/ai-elements/`, which are specifically designed to render the rich output from the AI SDK, including reasoning, tool usage, and sources.

### 2. Backend (The Orchestrator)

*   **Technology**: Next.js API Routes.
*   **Core Logic**: `starter-kit/src/app/api/chat/route.ts`
*   **Responsibilities**:
    1.  **Receive Requests**: Accepts `POST` requests from the frontend containing the chat history.
    2.  **Set Up Context**: Prepares the necessary components for the AI agent. This involves:
        *   Getting a wallet for the user (`getOrCreatePurchaserAccount`).
        *   Initializing a tool client (`mcpClient`) that is wrapped with payment logic (`withPayment`).
    3.  **Orchestrate Inference**: Calls the core AI logic (`streamText`) with the messages, tools, and system prompts.
    4.  **Stream Response**: Pipes the streaming output from the AI SDK back to the frontend.

### 3. AI Inference & Agency Core

*   **Technology**: Vercel AI SDK.
*   **Core Logic**: The `streamText` function call within `/api/chat/route.ts`.
*   **Functionality**:
    *   **Agency**: This is where the "agent" behavior is enabled. `streamText` is given a list of `tools` the AI can use. The AI model, based on the user's prompt, can decide to either generate text or call one of these tools.
    *   **Tool Definition**: Tools are defined with a name, a description (so the AI knows what it does), and an input schema (so the AI knows what parameters to provide).
    *   **System Prompt**: A high-level instruction, like `"ALWAYS prompt the user to confirm before authorizing payments"`, acts as a behavioral guardrail for the agent.

### 4. Tool & Service Layer (MCP)

*   **Technology**: Model Context Protocol (MCP).
*   **Core Logic**: `starter-kit/src/app/mcp/route.ts` (This is the MCP Server).
*   **Functionality**:
    *   This API route acts as a server that exposes a manifest of available tools to the AI agent.
    *   When the `mcpClient` in the `/api/chat` route calls `tools()`, it's making a request to this `/mcp` endpoint.
    *   This is where you would define the tools you want your agent to be able to use, such as fetching data from a database, calling an external API, or performing a specific calculation.

### 5. Payment Layer (x402)

This is the most innovative part of the architecture, weaving payments into the AI's capabilities.

*   **Technology**: `x402-next`, `x402-mcp`, `@coinbase/cdp-sdk`.
*   **Core Logic**:
    1.  **`starter-kit/src/middleware.ts`**: This file uses `x402-next` to create a **paywall**. It can protect entire pages or API routes. If a non-human visitor (like a bot) tries to access a protected page, it will be required to make a payment.
    2.  **`withPayment` wrapper**: This function from `x402-mcp` is used in the `/api/chat` route to wrap the `mcpClient`. It injects payment logic directly into the tool-calling mechanism. If the AI tries to use a tool that has a price defined on the MCP server, this wrapper intercepts the call and handles the x402 payment flow.
    3.  **`@coinbase/cdp-sdk`**: This SDK is used in `starter-kit/src/lib/accounts.ts` to communicate with the **Coinbase Developer Platform**. It's responsible for creating and managing the server-side wallets that are used for sending and receiving payments.

### End-to-End Request Lifecycle Example

1.  A user types "summarize the latest news from bbc.com" into the chat.
2.  The `useChat` hook sends this message to `/api/chat/route.ts`.
3.  The backend gets the user's wallet and creates a payment-enabled `mcpClient`.
4.  It calls `streamText`, giving the AI the user's prompt and a list of tools, one of which is a (hypothetical) paid tool called `fetchAndSummarizeURL`.
5.  The AI determines that it needs to use the `fetchAndSummarizeURL` tool and that the `url` parameter should be "bbc.com".
6.  The `withPayment` wrapper sees that this tool costs $0.01.
7.  Because of the system prompt, the AI doesn't immediately pay. Instead, its response to the user is: "I can do that. It will cost $0.01 to use the summarization tool. Shall I proceed?"
8.  The user types "Yes".
9.  The process repeats, but this time the AI calls the `fetchAndSummarizeURL` tool directly.
10. The `withPayment` wrapper executes the x402 payment to the tool provider.
11. The tool executes, fetches the content from bbc.com, and returns the summary to the AI.
12. The AI streams the final, summarized answer back to the user's screen.
