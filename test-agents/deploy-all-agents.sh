#!/bin/bash

# Deploy All Test Agents Script
# This script deploys all test agents to Cloudflare Workers with Venice API key

# Don't exit on error, handle them manually

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Venice API Key (you can change this)
VENICE_API_KEY="6VXSWjyW4Ea3ZL_SAkrFp_MbT-EDrNy0ZAXTAmwW1a"

echo -e "${BLUE}🚀 Starting deployment of all test agents...${NC}"
echo -e "${YELLOW}Using Venice API Key: ${VENICE_API_KEY:0:20}...${NC}"
echo ""

# Array of all agent directories
agents=(
    "coder-agent"
    "translator-agent"
    "code-reviewer-agent"
    "customer-support-agent"
    "content-generator-agent"
    "meeting-analyzer-agent"
    "email-classifier-agent"
    "quality-assurance-agent"
    "recommendation-engine-agent"
    "fraud-detector-agent"
)

# Function to deploy a single agent
deploy_agent() {
    local agent_dir=$1
    local agent_name=$(basename "$agent_dir")
    
    echo -e "${BLUE}📦 Deploying ${agent_name}...${NC}"
    
    # Navigate to agent directory
    cd "$agent_dir"
    
    # Check if wrangler.toml exists
    if [ ! -f "wrangler.toml" ]; then
        echo -e "${RED}❌ wrangler.toml not found in ${agent_name}${NC}"
        cd ..
        return 1
    fi
    
    # Set the Venice API key as a secret
    echo -e "${YELLOW}🔑 Setting Venice API key for ${agent_name}...${NC}"
    CLOUDFLARE_ACCOUNT_ID=2ff7a66618cc5f0d9a5ab90044188748 echo "$VENICE_API_KEY" | npx wrangler secret put VENICE_API_KEY --name "$agent_name"
    
    # Deploy the agent
    echo -e "${YELLOW}🚀 Deploying ${agent_name} to Cloudflare Workers...${NC}"
    if CLOUDFLARE_ACCOUNT_ID=2ff7a66618cc5f0d9a5ab90044188748 npx wrangler deploy --name "$agent_name"; then
        echo -e "${GREEN}✅ ${agent_name} deployed successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to deploy ${agent_name}${NC}"
        cd ..
        return 1
    fi
    
    # Go back to parent directory
    cd ..
    echo ""
}

# Deploy all agents
success_count=0
total_count=${#agents[@]}

for agent in "${agents[@]}"; do
    if [ -d "$agent" ]; then
        if deploy_agent "$agent"; then
            ((success_count++))
        fi
    else
        echo -e "${RED}❌ Directory ${agent} not found${NC}"
    fi
done

# Summary
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo -e "${GREEN}✅ Successful: ${success_count}/${total_count}${NC}"
echo -e "${RED}❌ Failed: $((total_count - success_count))/${total_count}${NC}"

if [ $success_count -eq $total_count ]; then
    echo -e "${GREEN}🎉 All agents deployed successfully!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some agents failed to deploy. Check the logs above.${NC}"
    exit 1
fi
