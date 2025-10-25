#!/bin/bash

# Test script for the new A2A agents (Quality Assurance, Recommendation Engine, Fraud Detection)
# This script will test each new agent individually with specific test cases

set -e  # Exit on any error

echo "🧪 Testing new A2A agents..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# New agent configurations (name, directory, port, test case)
declare -A NEW_AGENTS=(
    ["quality-assurance-agent"]="41249"
    ["recommendation-engine-agent"]="41250"
    ["fraud-detector-agent"]="41251"
)

# Function to test a single agent
test_agent() {
    local agent_name="$1"
    local port="$2"
    
    echo "🔍 Testing $agent_name on port $port..."
    
    # Start the agent
    cd "$agent_name"
    npm run dev > /dev/null 2>&1 &
    local agent_pid=$!
    cd "$SCRIPT_DIR"
    
    # Wait for agent to start
    echo "   ⏳ Waiting for agent to start..."
    sleep 5
    
    # Test health endpoint
    echo "   🏥 Testing health endpoint..."
    if curl -s "http://localhost:$port/health" | grep -q "ok"; then
        echo "   ✅ Health check passed"
    else
        echo "   ❌ Health check failed"
        kill $agent_pid 2>/dev/null || true
        return 1
    fi
    
    # Test agent card endpoint
    echo "   📄 Testing agent card endpoint..."
    if curl -s "http://localhost:$port/card" | grep -q "name"; then
        echo "   ✅ Agent card endpoint working"
    else
        echo "   ❌ Agent card endpoint failed"
        kill $agent_pid 2>/dev/null || true
        return 1
    fi
    
    # Test specific functionality based on agent type
    echo "   🧪 Testing agent functionality..."
    case "$agent_name" in
        "quality-assurance-agent")
            test_quality_assurance "$port"
            ;;
        "recommendation-engine-agent")
            test_recommendation_engine "$port"
            ;;
        "fraud-detector-agent")
            test_fraud_detector "$port"
            ;;
    esac
    
    # Stop the agent
    echo "   🛑 Stopping agent..."
    kill $agent_pid 2>/dev/null || true
    sleep 2
    
    echo "   ✅ $agent_name test completed successfully"
    echo ""
}

# Test functions for each agent type
test_quality_assurance() {
    local port="$1"
    local response=$(curl -s -X POST "http://localhost:$port/tasks" \
        -H "Content-Type: application/json" \
        -d '{
            "task": {
                "input": {
                    "skill": "test_generation",
                    "code": "function add(a, b) { return a + b; }",
                    "language": "JavaScript"
                }
            }
        }')
    
    if echo "$response" | grep -q "testCases\|analysis"; then
        echo "   ✅ Test generation test passed"
    else
        echo "   ❌ Test generation test failed"
        echo "   Response: $response"
    fi
}

test_recommendation_engine() {
    local port="$1"
    local response=$(curl -s -X POST "http://localhost:$port/tasks" \
        -H "Content-Type: application/json" \
        -d '{
            "task": {
                "input": {
                    "skill": "collaborative_filtering",
                    "userProfile": {
                        "preferences": ["action", "comedy"],
                        "history": ["movie1", "movie2"]
                    },
                    "items": [
                        {"id": "movie3", "title": "Action Movie", "genre": "action"},
                        {"id": "movie4", "title": "Comedy Film", "genre": "comedy"}
                    ]
                }
            }
        }')
    
    if echo "$response" | grep -q "recommendations\|analysis"; then
        echo "   ✅ Recommendation test passed"
    else
        echo "   ❌ Recommendation test failed"
        echo "   Response: $response"
    fi
}

test_fraud_detector() {
    local port="$1"
    local response=$(curl -s -X POST "http://localhost:$port/tasks" \
        -H "Content-Type: application/json" \
        -d '{
            "task": {
                "input": {
                    "skill": "anomaly_detection",
                    "transaction": {
                        "amount": 5000,
                        "merchant": "Unknown Store",
                        "location": "Different Country"
                    },
                    "userHistory": [
                        {"amount": 50, "merchant": "Local Store"}
                    ]
                }
            }
        }')
    
    if echo "$response" | grep -q "anomalies\|analysis"; then
        echo "   ✅ Fraud detection test passed"
    else
        echo "   ❌ Fraud detection test failed"
        echo "   Response: $response"
    fi
}

# Test each new agent
echo "🚀 Starting new agent testing..."
echo ""

for agent_name in "${!NEW_AGENTS[@]}"; do
    test_agent "$agent_name" "${NEW_AGENTS[$agent_name]}"
done

echo "🎉 All new agent tests completed!"
echo ""
echo "📊 Test Summary:"
echo "   - Total new agents tested: ${#NEW_AGENTS[@]}"
echo "   - All new agents should be working correctly"
echo ""
echo "💡 To start all agents simultaneously, run: ./start-all.sh"
echo "🛑 To stop all agents, run: ./stop-all.sh"
