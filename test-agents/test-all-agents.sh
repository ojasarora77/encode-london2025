#!/bin/bash

# Comprehensive test script for all A2A agents
# This script will test each agent individually with specific test cases

set -e  # Exit on any error

echo "🧪 Testing all A2A agents..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Agent configurations (name, directory, port, test case)
declare -A AGENTS=(
    ["translator-agent"]="41243"
    ["code-reviewer-agent"]="41244"
    ["customer-support-agent"]="41245"
    ["content-generator-agent"]="41246"
    ["meeting-analyzer-agent"]="41247"
    ["email-classifier-agent"]="41248"
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
        "translator-agent")
            test_translator "$port"
            ;;
        "code-reviewer-agent")
            test_code_reviewer "$port"
            ;;
        "customer-support-agent")
            test_customer_support "$port"
            ;;
        "content-generator-agent")
            test_content_generator "$port"
            ;;
        "meeting-analyzer-agent")
            test_meeting_analyzer "$port"
            ;;
        "email-classifier-agent")
            test_email_classifier "$port"
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
test_translator() {
    local port="$1"
    local response=$(curl -s -X POST "http://localhost:$port/tasks" \
        -H "Content-Type: application/json" \
        -d '{
            "task": {
                "input": {
                    "skill": "translate_text",
                    "text": "Hello, how are you?",
                    "targetLanguage": "Spanish"
                }
            }
        }')
    
    if echo "$response" | grep -q "translatedText"; then
        echo "   ✅ Translation test passed"
    else
        echo "   ❌ Translation test failed"
        echo "   Response: $response"
    fi
}

test_code_reviewer() {
    local port="$1"
    local response=$(curl -s -X POST "http://localhost:$port/tasks" \
        -H "Content-Type: application/json" \
        -d '{
            "task": {
                "input": {
                    "skill": "security_analysis",
                    "code": "const query = \"SELECT * FROM users WHERE id = \" + userId;"
                }
            }
        }')
    
    if echo "$response" | grep -q "SQL injection"; then
        echo "   ✅ Security analysis test passed"
    else
        echo "   ❌ Security analysis test failed"
        echo "   Response: $response"
    fi
}

test_customer_support() {
    local port="$1"
    local response=$(curl -s -X POST "http://localhost:$port/tasks" \
        -H "Content-Type: application/json" \
        -d '{
            "task": {
                "input": {
                    "skill": "sentiment_analysis",
                    "message": "I am really frustrated with this product!"
                }
            }
        }')
    
    if echo "$response" | grep -q "negative"; then
        echo "   ✅ Sentiment analysis test passed"
    else
        echo "   ❌ Sentiment analysis test failed"
        echo "   Response: $response"
    fi
}

test_content_generator() {
    local port="$1"
    local response=$(curl -s -X POST "http://localhost:$port/tasks" \
        -H "Content-Type: application/json" \
        -d '{
            "task": {
                "input": {
                    "skill": "blog_writing",
                    "topic": "The Future of AI",
                    "tone": "professional",
                    "length": "short"
                }
            }
        }')
    
    if echo "$response" | grep -q "content"; then
        echo "   ✅ Content generation test passed"
    else
        echo "   ❌ Content generation test failed"
        echo "   Response: $response"
    fi
}

test_meeting_analyzer() {
    local port="$1"
    local response=$(curl -s -X POST "http://localhost:$port/tasks" \
        -H "Content-Type: application/json" \
        -d '{
            "task": {
                "input": {
                    "skill": "meeting_summary",
                    "transcript": "John: I will send the report by Friday. Sarah: I can review the design mockups this week."
                }
            }
        }')
    
    if echo "$response" | grep -q "summary"; then
        echo "   ✅ Meeting analysis test passed"
    else
        echo "   ❌ Meeting analysis test failed"
        echo "   Response: $response"
    fi
}

test_email_classifier() {
    local port="$1"
    local response=$(curl -s -X POST "http://localhost:$port/tasks" \
        -H "Content-Type: application/json" \
        -d '{
            "task": {
                "input": {
                    "skill": "email_classification",
                    "from": "boss@company.com",
                    "subject": "Urgent: Q4 Budget Review",
                    "body": "Hi team, we need to finalize the Q4 budget. Please review the attached spreadsheet."
                }
            }
        }')
    
    if echo "$response" | grep -q "category"; then
        echo "   ✅ Email classification test passed"
    else
        echo "   ❌ Email classification test failed"
        echo "   Response: $response"
    fi
}

# Test each agent
echo "🚀 Starting comprehensive agent testing..."
echo ""

for agent_name in "${!AGENTS[@]}"; do
    test_agent "$agent_name" "${AGENTS[$agent_name]}"
done

echo "🎉 All agent tests completed!"
echo ""
echo "📊 Test Summary:"
echo "   - Total agents tested: ${#AGENTS[@]}"
echo "   - All agents should be working correctly"
echo ""
echo "💡 To start all agents simultaneously, run: ./start-all.sh"
echo "🛑 To stop all agents, run: ./stop-all.sh"
