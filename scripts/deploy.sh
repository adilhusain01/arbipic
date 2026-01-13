#!/bin/bash

# ArbiPic Contract Deployment Script
# Deploy Stylus contract to Arbitrum Sepolia

set -e

echo "🚀 Building Stylus Contract..."
cd contracts
cargo stylus check

echo "📦 Exporting ABI..."
cargo build --release --features export-abi

echo "🔍 Estimating gas..."
cargo stylus estimate-gas --endpoint https://sepolia-rollup.arbitrum.io/rpc

echo "📤 Deploying to Arbitrum Sepolia..."
echo "Make sure you have PRIVATE_KEY environment variable set"

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable not set"
    exit 1
fi

cargo stylus deploy \
    --endpoint https://sepolia-rollup.arbitrum.io/rpc \
    --private-key $PRIVATE_KEY \
    --no-verify

echo "✅ Deployment complete!"
echo "📝 Update the contract address in frontend/src/config.ts"
