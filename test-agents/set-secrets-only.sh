#!/bin/bash

# Set Venice API Key for All Test Agents
# This script only sets the secrets, doesn't deploy

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Venice API Key
VENICE_API_KEY="6VXSWjyW4Ea3ZL_SAkrFp_MbT-EDrNy0ZAXTAmwW1a"

echo -e "${BLUE}🔑 Setting Venice API key for all test agents...${NC}"
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

# Function to set secret for a single agent
set_secret() {
    local agent_dir=$1
    local agent_name=$(basename "$agent_dir")
    
    echo -e "${BLUE}🔑 Setting secret for ${agent_name}...${NC}"
    
    # Navigate to agent directory
    cd "$agent_dir"
    
    # Check if wrangler.toml exists
    if [ ! -f "wrangler.toml" ]; then
        echo -e "${RED}❌ wrangler.toml not found in ${agent_name}${NC}"
        cd ..
        return 1
    fi
    
    # Set the Venice API key as a secret
    echo "$VENICE_API_KEY" | npx wrangler secret put VENICE_API_KEY --name "$agent_name"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Secret set for ${agent_name}${NC}"
    else
        echo -e "${RED}❌ Failed to set secret for ${agent_name}${NC}"
        cd ..
        return 1
    fi
    
    # Go back to parent directory
    cd ..
    echo ""
}

# Set secrets for all agents
success_count=0
total_count=${#agents[@]}

for agent in "${agents[@]}"; do
    if [ -d "$agent" ]; then
        if set_secret "$agent"; then
            ((success_count++))
        fi
    else
        echo -e "${RED}❌ Directory ${agent} not found${NC}"
    fi
done

# Summary
echo -e "${BLUE}📊 Secret Setting Summary:${NC}"
echo -e "${GREEN}✅ Successful: ${success_count}/${total_count}${NC}"
echo -e "${RED}❌ Failed: $((total_count - success_count))/${total_count}${NC}"

if [ $success_count -eq $total_count ]; then
    echo -e "${GREEN}🎉 All secrets set successfully!${NC}"
    echo -e "${YELLOW}💡 You can now deploy each agent manually with: npx wrangler deploy${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some secrets failed to set. Check the logs above.${NC}"
    exit 1
fi
