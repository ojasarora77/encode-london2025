#!/bin/bash

# Install dependencies for all A2A test agents
# This script will run npm install in each agent directory

set -e  # Exit on any error

echo "🚀 Installing dependencies for all A2A test agents..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# List of all agent directories
AGENTS=(
    "coder-agent"
    "translator-agent"
    "code-reviewer-agent"
    "customer-support-agent"
    "content-generator-agent"
    "meeting-analyzer-agent"
    "email-classifier-agent"
)

# Function to install dependencies for a single agent
install_agent() {
    local agent_dir="$1"
    
    if [ -d "$agent_dir" ]; then
        echo "📦 Installing dependencies for $agent_dir..."
        cd "$agent_dir"
        
        if [ -f "package.json" ]; then
            npm install
            echo "✅ $agent_dir dependencies installed successfully"
        else
            echo "⚠️  No package.json found in $agent_dir"
        fi
        
        cd "$SCRIPT_DIR"
        echo ""
    else
        echo "❌ Directory $agent_dir not found"
        echo ""
    fi
}

# Install dependencies for each agent
for agent in "${AGENTS[@]}"; do
    install_agent "$agent"
done

echo "🎉 All agent dependencies installation completed!"
echo ""
echo "📋 Summary:"
echo "   - Total agents processed: ${#AGENTS[@]}"
echo "   - Agents: ${AGENTS[*]}"
echo ""
echo "🚀 You can now start individual agents with:"
echo "   cd <agent-directory> && npm run dev"
echo ""
echo "💡 To start all agents simultaneously, use the start-all.sh script"
