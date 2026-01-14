/**
 * Ethereum Attestation Service (EAS) Integration
 * Creates on-chain attestations for verified photos
 * 
 * EAS on Arbitrum Sepolia: 0xaEF4103A04090071165F78D45D83A0C0782c2B2a
 * Schema Registry: 0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797
 */

import { EAS, SchemaEncoder, SchemaRegistry, NO_EXPIRATION } from '@ethereum-attestation-service/eas-sdk'
import { ethers, solidityPackedKeccak256 } from 'ethers'

// EAS Contract addresses on Arbitrum Sepolia
export const EAS_CONTRACT_ADDRESS = '0xaEF4103A04090071165F78D45D83A0C0782c2B2a'
export const SCHEMA_REGISTRY_ADDRESS = '0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797'

// Our photo verification schema
export const PHOTO_VERIFICATION_SCHEMA = 'bytes32 photoHash, uint256 timestamp, address photographer, string ipfsCid, bytes32 zkCommitment'

// Storage key for schema UID
const SCHEMA_UID_KEY = 'arbipic_eas_schema_uid'

export interface PhotoAttestationData {
  photoHash: string
  timestamp: number
  photographer: string
  ipfsCid: string
  zkCommitment: string
}

/**
 * Compute the schema UID deterministically (same algorithm as EAS SDK)
 */
export function computeSchemaUID(): string {
  return solidityPackedKeccak256(
    ['string', 'address', 'bool'],
    [PHOTO_VERIFICATION_SCHEMA, '0x0000000000000000000000000000000000000000', true]
  )
}

/**
 * Get or register the schema UID
 */
async function getOrRegisterSchemaUID(signer: ethers.Signer): Promise<string> {
  const computedUID = computeSchemaUID()
  console.log('📋 Computed schema UID:', computedUID)
  
  // Update localStorage if needed
  const storedUID = localStorage.getItem(SCHEMA_UID_KEY)
  if (storedUID !== computedUID) {
    localStorage.setItem(SCHEMA_UID_KEY, computedUID)
  }
  
  // Check if schema is already registered on-chain
  try {
    const schemaRegistry = new SchemaRegistry(SCHEMA_REGISTRY_ADDRESS)
    schemaRegistry.connect(signer)
    
    const schema = await schemaRegistry.getSchema({ uid: computedUID })
    console.log('✅ Schema already registered:', schema.uid)
    return computedUID
  } catch (e) {
    console.log('📝 Schema not found, attempting to register...')
  }
  
  // Try to register the schema
  try {
    const schemaRegistry = new SchemaRegistry(SCHEMA_REGISTRY_ADDRESS)
    schemaRegistry.connect(signer)
    
    const transaction = await schemaRegistry.register({
      schema: PHOTO_VERIFICATION_SCHEMA,
      resolverAddress: '0x0000000000000000000000000000000000000000',
      revocable: true
    })
    
    const uid = await transaction.wait()
    console.log('✅ Schema registered with UID:', uid)
    return uid
  } catch (error: any) {
    console.warn('⚠️ Schema registration failed:', error.message?.slice(0, 100))
    // Return computed UID anyway - maybe it exists but we couldn't check
    return computedUID
  }
}

/**
 * Generate EAS explorer link for attestation
 */
export function getEASExplorerUrl(attestationUID: string): string {
  return `https://arbitrum-sepolia.easscan.org/attestation/view/${attestationUID}`
}

/**
 * Create on-chain EAS attestation for a verified photo
 * Uses the EAS SDK properly as documented
 */
export async function createSimpleAttestation(
  photoHash: string,
  timestamp: number,
  photographer: string,
  ipfsCid: string,
  zkCommitment: string
): Promise<{ success: boolean; attestationId?: string; explorerUrl?: string; error?: string }> {
  try {
    const ethereum = (window as any).ethereum
    if (!ethereum) {
      return { success: false, error: 'MetaMask not found' }
    }

    console.log('📜 Creating on-chain EAS attestation...')
    
    // Create ethers provider and signer
    const provider = new ethers.BrowserProvider(ethereum)
    const signer = await provider.getSigner()
    
    // Get schema UID
    const schemaUID = await getOrRegisterSchemaUID(signer)
    console.log('📋 Using schema UID:', schemaUID)
    
    // Initialize EAS
    const eas = new EAS(EAS_CONTRACT_ADDRESS)
    eas.connect(signer)
    
    // Ensure photoHash and zkCommitment are proper bytes32
    let formattedPhotoHash = photoHash.startsWith('0x') ? photoHash : `0x${photoHash}`
    let formattedZkCommitment = zkCommitment.startsWith('0x') ? zkCommitment : `0x${zkCommitment}`
    
    // Pad to 64 hex chars (32 bytes) after 0x
    formattedPhotoHash = formattedPhotoHash.slice(0, 2) + formattedPhotoHash.slice(2).padStart(64, '0')
    formattedZkCommitment = formattedZkCommitment.slice(0, 2) + formattedZkCommitment.slice(2).padStart(64, '0')
    
    // Encode attestation data using SchemaEncoder (as shown in EAS SDK README)
    const schemaEncoder = new SchemaEncoder(PHOTO_VERIFICATION_SCHEMA)
    const encodedData = schemaEncoder.encodeData([
      { name: 'photoHash', value: formattedPhotoHash, type: 'bytes32' },
      { name: 'timestamp', value: BigInt(timestamp), type: 'uint256' },
      { name: 'photographer', value: photographer, type: 'address' },
      { name: 'ipfsCid', value: ipfsCid || '', type: 'string' },
      { name: 'zkCommitment', value: formattedZkCommitment, type: 'bytes32' }
    ])

    console.log('📤 Sending EAS attestation via SDK...')
    
    // Create attestation using the SDK (as documented)
    const transaction = await eas.attest({
      schema: schemaUID,
      data: {
        recipient: photographer,
        expirationTime: NO_EXPIRATION,
        revocable: true,
        data: encodedData
      }
    })
    
    console.log('⏳ Waiting for transaction confirmation...')
    
    // Wait for the transaction and get the attestation UID
    const attestationUID = await transaction.wait()
    
    console.log('✅ EAS Attestation created:', attestationUID)
    
    // Store attestation data locally for reference
    const attestationData = {
      uid: attestationUID,
      schemaUID,
      photoHash: formattedPhotoHash,
      timestamp,
      photographer,
      ipfsCid,
      zkCommitment: formattedZkCommitment,
      createdAt: new Date().toISOString(),
      txHash: transaction.receipt?.hash
    }
    localStorage.setItem(`eas_attestation_${photoHash.replace('0x', '')}`, JSON.stringify(attestationData))
    
    return { 
      success: true, 
      attestationId: attestationUID,
      explorerUrl: getEASExplorerUrl(attestationUID)
    }
  } catch (error: any) {
    console.error('EAS attestation error:', error)
    
    // Check if it's a simulation/revert error
    if (error.code === -32603 || error.message?.includes('Internal JSON-RPC')) {
      return {
        success: false,
        error: 'Transaction simulation failed. The schema may not be registered. Please register at: https://arbitrum-sepolia.easscan.org/schema/create with schema: ' + PHOTO_VERIFICATION_SCHEMA
      }
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to create attestation'
    }
  }
}

/**
 * Get attestation by UID
 */
export async function getAttestation(uid: string) {
  const ethereum = (window as any).ethereum
  if (!ethereum) return null
  
  const provider = new ethers.BrowserProvider(ethereum)
  const eas = new EAS(EAS_CONTRACT_ADDRESS)
  eas.connect(provider)
  
  return await eas.getAttestation(uid)
}

/**
 * Check if photo has EAS attestation (from localStorage)
 */
export function getLocalEASAttestation(photoHash: string): any | null {
  const cleanHash = photoHash.replace('0x', '')
  const data = localStorage.getItem(`eas_attestation_${cleanHash}`)
  return data ? JSON.parse(data) : null
}

/**
 * Set schema UID manually (if registered via explorer)
 */
export function setSchemaUID(uid: string): void {
  localStorage.setItem(SCHEMA_UID_KEY, uid)
  console.log('📋 Schema UID set:', uid)
}

/**
 * Get current schema UID
 */
export function getSchemaUID(): string | null {
  return localStorage.getItem(SCHEMA_UID_KEY)
}
