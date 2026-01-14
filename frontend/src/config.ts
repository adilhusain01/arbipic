import { http, createConfig } from 'wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import type { Chain } from 'viem'
import { injected } from 'wagmi/connectors'

// Use the official Arbitrum Sepolia RPC (Omnia has issues with eth_sendRawTransaction)
const ARBITRUM_SEPOLIA_RPC = 'https://sepolia-rollup.arbitrum.io/rpc'

// Local L3 Orbit chain configuration
export const orbitL3: Chain = {
  id: 333333,
  name: 'ArbiPic L3 (Orbit)',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:3347'],
    },
  },
  blockExplorers: undefined,
  testnet: true,
}

// Local L2 chain (nitro-testnode)
export const localL2: Chain = {
  id: 412346,
  name: 'Local L2 (Nitro)',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8547'],
    },
  },
  blockExplorers: undefined,
  testnet: true,
}

export const config = createConfig({
  chains: [arbitrumSepolia, orbitL3, localL2],
  connectors: [
    injected(),
  ],
  transports: {
    [arbitrumSepolia.id]: http(ARBITRUM_SEPOLIA_RPC),
    [orbitL3.id]: http('http://127.0.0.1:3347'),
    [localL2.id]: http('http://127.0.0.1:8547'),
  },
})

// Contract ABI for the Verifier contract - MINIMAL storage version
// NOTE: Stylus SDK converts Rust snake_case to Solidity camelCase
export const VERIFIER_ABI = [
  {
    "type": "function",
    "name": "init",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "verifyPhoto",
    "inputs": [
      { "name": "photoHash", "type": "uint256" },
      { "name": "zkCommitment", "type": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getAttestation",
    "inputs": [
      { "name": "photoHash", "type": "uint256" }
    ],
    "outputs": [
      { "name": "verifiedAt", "type": "uint256" },
      { "name": "owner", "type": "address" },
      { "name": "zkCommitment", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verifyZkProof",
    "inputs": [
      { "name": "photoHash", "type": "uint256" },
      { "name": "secret", "type": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isVerified",
    "inputs": [
      { "name": "photoHash", "type": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOwnerOf",
    "inputs": [
      { "name": "photoHash", "type": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "address" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOwnerPhotoCount",
    "inputs": [
      { "name": "owner", "type": "address" }
    ],
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPhotoCount",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getContractOwner",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "address" }
    ],
    "stateMutability": "view"
  }
] as const

// Update this with your deployed contract address
export const VERIFIER_ADDRESS = '0xeb246817d2440f82f4b4c04c2c120afefe1e5ec4' as const

// L3 Orbit contract address
export const L3_VERIFIER_ADDRESS = '0x1294b86822ff4976bfe136cb06cf43ec7fcf2574' as const

// Get the correct contract address based on chain ID
export function getContractAddress(chainId: number): `0x${string}` {
  if (chainId === 333333) {
    return L3_VERIFIER_ADDRESS
  }
  return VERIFIER_ADDRESS
}

// Pinata IPFS configuration (use JWT for SDK)
// Get your JWT from https://app.pinata.cloud/developers/api-keys
export const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || ''
export const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'gateway.pinata.cloud'

// App configuration
export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173'
