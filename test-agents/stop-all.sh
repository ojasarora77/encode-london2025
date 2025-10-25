#!/bin/bash

# Stop all A2A test agents
# This script will kill all running wrangler dev processes

echo "🛑 Stopping all A2A test agents..."
echo ""

# Kill all wrangler dev processes
echo "🔍 Looking for running wrangler dev processes..."

# Find and kill wrangler dev processes
PIDS=$(pgrep -f "wrangler dev" 2>/dev/null || true)

if [ -n "$PIDS" ]; then
    echo "📋 Found running agents:"
    ps -p $PIDS -o pid,ppid,cmd --no-headers | while read line; do
        echo "   - $line"
    done
    echo ""
    
    echo "🛑 Stopping agents..."
    kill $PIDS 2>/dev/null || true
    
    # Wait a moment for graceful shutdown
    sleep 2
    
    # Force kill if still running
    REMAINING=$(pgrep -f "wrangler dev" 2>/dev/null || true)
    if [ -n "$REMAINING" ]; then
        echo "🔨 Force stopping remaining processes..."
        kill -9 $REMAINING 2>/dev/null || true
    fi
    
    echo "✅ All agents stopped"
else
    echo "ℹ️  No running wrangler dev processes found"
fi

echo ""
echo "🔍 Checking for any remaining processes on agent ports..."

# Check if any processes are still running on agent ports
PORTS=(41242 41243 41244 41245 41246 41247 41248)
AGENT_NAMES=("coder-agent" "translator-agent" "code-reviewer-agent" "customer-support-agent" "content-generator-agent" "meeting-analyzer-agent" "email-classifier-agent")

for i in "${!PORTS[@]}"; do
    port="${PORTS[$i]}"
    agent_name="${AGENT_NAMES[$i]}"
    
    # Check if port is in use
    if lsof -i:$port >/dev/null 2>&1; then
        echo "   ⚠️  Port $port ($agent_name) is still in use"
        # Optionally kill processes on specific ports
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    else
        echo "   ✅ Port $port ($agent_name) is free"
    fi
done

echo ""
echo "🎉 All agents stopped successfully!"
echo ""
echo "💡 To start agents again, run: ./start-all.sh"
