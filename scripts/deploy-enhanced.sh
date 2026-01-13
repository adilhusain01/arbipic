#!/bin/bash

# ArbiPic Enhanced Contract Deployment Script
# Deploy Stylus contract with full metadata support to Arbitrum Sepolia

set -e

echo "🚀 ArbiPic Enhanced Deployment"
echo "================================"
echo ""

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable not set"
    echo ""
    echo "Usage:"
    echo "  export PRIVATE_KEY=\"your_private_key_here\""
    echo "  ./scripts/deploy-enhanced.sh"
    echo ""
    exit 1
fi

cd contracts

echo "🔍 Step 1: Checking contract..."
cargo stylus check --endpoint https://sepolia-rollup.arbitrum.io/rpc

echo ""
echo "📦 Step 2: Deploying to Arbitrum Sepolia..."
echo ""

DEPLOYMENT_OUTPUT=$(cargo stylus deploy \
    --endpoint https://sepolia-rollup.arbitrum.io/rpc \
    --private-key $PRIVATE_KEY 2>&1)

echo "$DEPLOYMENT_OUTPUT"

# Extract contract address from output
CONTRACT_ADDRESS=$(echo "$DEPLOYMENT_OUTPUT" | grep -o "0x[a-fA-F0-9]\{40\}" | head -1)

if [ -n "$CONTRACT_ADDRESS" ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Contract Details:"
    echo "   Address: $CONTRACT_ADDRESS"
    echo "   Network: Arbitrum Sepolia"
    echo "   Explorer: https://sepolia.arbiscan.io/address/$CONTRACT_ADDRESS"
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Update frontend/src/config.ts with this address:"
    echo "      export const VERIFIER_ADDRESS = '$CONTRACT_ADDRESS' as const"
    echo ""
    echo "   2. Initialize the contract:"
    echo "      Call the init() function from your frontend"
    echo ""
    echo "   3. Start verifying photos!"
    echo ""
else
    echo ""
    echo "❌ Deployment may have failed. Check output above."
    echo ""
    exit 1
fi
