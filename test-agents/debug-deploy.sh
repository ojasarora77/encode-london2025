#!/bin/bash

# Debug deployment script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Venice API Key
VENICE_API_KEY="6VXSWjyW4Ea3ZL_SAkrFp_MbT-EDrNy0ZAXTAmwW1a"

echo -e "${BLUE}🚀 Debug: Starting deployment of all test agents...${NC}"

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

echo -e "${BLUE}📋 Found ${#agents[@]} agents to deploy${NC}"

success_count=0
total_count=${#agents[@]}

for i in "${!agents[@]}"; do
    agent="${agents[$i]}"
    echo -e "${BLUE}🔄 Processing agent $((i+1))/${total_count}: ${agent}${NC}"
    
    if [ -d "$agent" ]; then
        echo -e "${BLUE}📦 Deploying ${agent}...${NC}"
        
        # Navigate to agent directory
        cd "$agent"
        
        # Check if wrangler.toml exists
        if [ ! -f "wrangler.toml" ]; then
            echo -e "${RED}❌ wrangler.toml not found in ${agent}${NC}"
            cd ..
            continue
        fi
        
        # Set the Venice API key as a secret
        echo -e "${YELLOW}🔑 Setting Venice API key for ${agent}...${NC}"
        echo "$VENICE_API_KEY" | npx wrangler secret put VENICE_API_KEY --name "$agent"
        
        # Deploy the agent
        echo -e "${YELLOW}🚀 Deploying ${agent} to Cloudflare Workers...${NC}"
        if npx wrangler deploy --name "$agent"; then
            echo -e "${GREEN}✅ ${agent} deployed successfully!${NC}"
            ((success_count++))
        else
            echo -e "${RED}❌ Failed to deploy ${agent}${NC}"
        fi
        
        # Go back to parent directory
        cd ..
        echo -e "${BLUE}✅ Completed ${agent}, moving to next...${NC}"
        echo ""
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
    echo -e "${YELLOW}⚠️  Some agents failed to deploy. Check the logs above.${NC}"
    exit 0
fi
