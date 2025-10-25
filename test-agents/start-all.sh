#!/bin/bash

# Start all A2A test agents simultaneously
# This script will start each agent in a separate terminal window/tab

set -e  # Exit on any error

echo "🚀 Starting all A2A test agents..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Agent configurations (name, directory, port)
declare -A AGENTS=(
    ["coder-agent"]="41242"
    ["translator-agent"]="41243"
    ["code-reviewer-agent"]="41244"
    ["customer-support-agent"]="41245"
    ["content-generator-agent"]="41246"
    ["meeting-analyzer-agent"]="41247"
    ["email-classifier-agent"]="41248"
)

# Function to start a single agent
start_agent() {
    local agent_name="$1"
    local port="$2"
    
    if [ -d "$agent_name" ]; then
        echo "🚀 Starting $agent_name on port $port..."
        
        # Check if the agent has package.json and the dev script
        if [ -f "$agent_name/package.json" ]; then
            # Start the agent in the background
            cd "$agent_name"
            npm run dev &
            local pid=$!
            echo "   ✅ $agent_name started (PID: $pid) on http://localhost:$port"
            cd "$SCRIPT_DIR"
        else
            echo "   ❌ No package.json found in $agent_name"
        fi
    else
        echo "   ❌ Directory $agent_name not found"
    fi
    echo ""
}

# Start each agent
for agent_name in "${!AGENTS[@]}"; do
    start_agent "$agent_name" "${AGENTS[$agent_name]}"
done

echo "🎉 All agents started!"
echo ""
echo "📋 Agent Status:"
for agent_name in "${!AGENTS[@]}"; do
    echo "   - $agent_name: http://localhost:${AGENTS[$agent_name]}"
done
echo ""
echo "🔍 Health Check URLs:"
for agent_name in "${!AGENTS[@]}"; do
    echo "   - $agent_name: http://localhost:${AGENTS[$agent_name]}/health"
done
echo ""
echo "📄 Agent Card URLs:"
for agent_name in "${!AGENTS[@]}"; do
    echo "   - $agent_name: http://localhost:${AGENTS[$agent_name]}/card"
done
echo ""
echo "🛑 To stop all agents, press Ctrl+C or run: pkill -f 'wrangler dev'"
echo ""
echo "💡 Individual agent commands:"
for agent_name in "${!AGENTS[@]}"; do
    echo "   cd $agent_name && npm run dev"
done
