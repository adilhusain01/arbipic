#!/bin/bash

# Quick check script for Stylus contract

set -e

echo "🔍 Checking Stylus contract..."
cd contracts
cargo stylus check --endpoint https://sepolia-rollup.arbitrum.io/rpc

echo "✅ Contract check passed!"
