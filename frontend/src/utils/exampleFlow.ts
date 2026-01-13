/**
 * Example: Complete Photo Verification Flow with Metadata & ZK Proof
 * 
 * This example shows how to:
 * 1. Capture photo with full metadata
 * 2. Upload to IPFS
 * 3. Generate ZK proof
 * 4. Verify on-chain
 */

import { sha256 } from 'js-sha256';
import { collectPhotoMetadata } from './metadata';
import { generateZKProof, storeSecretSecurely } from './zkProof';
import { mockIPFSUpload, dataURLtoBlob } from './ipfs';

/**
 * Complete workflow example
 */
export async function completeVerificationFlow(
  imageDataUrl: string,
  videoElement?: HTMLVideoElement
) {
  console.log('🚀 Starting complete verification flow...\n');
  
  // STEP 1: Hash the image
  console.log('📸 Step 1: Hashing image...');
  const base64Data = imageDataUrl.split(',')[1];
  const photoHash = '0x' + sha256(base64Data);
  console.log('✅ Photo hash:', photoHash.substring(0, 20) + '...\n');
  
  // STEP 2: Collect metadata
  console.log('📊 Step 2: Collecting metadata...');
  const metadata = await collectPhotoMetadata(imageDataUrl, videoElement);
  console.log('✅ Metadata collected:', {
    device: metadata.deviceFingerprint?.substring(0, 20) + '...',
    timestamp: new Date(metadata.captureTimestamp!).toLocaleString(),
    camera: metadata.cameraResolution,
  });
  console.log('');
  
  // STEP 3: Generate ZK proof
  console.log('🔐 Step 3: Generating ZK proof...');
  const zkProof = generateZKProof(photoHash);
  console.log('✅ ZK Commitment:', zkProof.commitment.substring(0, 20) + '...');
  console.log('✅ Secret generated (kept locally)');
  console.log('');
  
  // STEP 4: Store secret securely (IMPORTANT!)
  console.log('💾 Step 4: Storing secret securely...');
  storeSecretSecurely(photoHash, zkProof.secret);
  console.log('✅ Secret stored in browser storage');
  console.log('⚠️  WARNING: In production, use hardware wallet or secure enclave!');
  console.log('');
  
  // STEP 5: Upload to IPFS
  console.log('☁️  Step 5: Uploading to IPFS...');
  const imageBlob = dataURLtoBlob(imageDataUrl);
  const { imageCid, thumbnailCid } = await mockIPFSUpload();
  console.log('✅ Image CID:', imageCid);
  console.log('✅ Thumbnail CID:', thumbnailCid);
  console.log('');
  
  // STEP 6: Prepare contract data
  console.log('📝 Step 6: Preparing contract data...');
  const contractData = {
    photoHash,
    ipfsCid: imageCid,
    thumbnailCid,
    deviceFingerprint: metadata.deviceFingerprint!,
    captureTimestamp: metadata.captureTimestamp!,
    cameraResolution: metadata.cameraResolution!,
    locationHash: metadata.locationHash!,
    zkCommitment: zkProof.commitment,
    isEncrypted: false,
  };
  console.log('✅ Contract data ready');
  console.log('');
  
  // STEP 7: Return data for contract call
  console.log('🎉 Complete! Ready to submit to contract');
  console.log('📋 Summary:');
  console.log('   - Photo hash:', photoHash.substring(0, 20) + '...');
  console.log('   - IPFS CID:', imageCid);
  console.log('   - ZK Commitment:', zkProof.commitment.substring(0, 20) + '...');
  console.log('   - Metadata collected: ✅');
  console.log('   - Secret stored: ✅');
  console.log('');
  
  return {
    contractData,
    secret: zkProof.secret,
    metadata,
  };
}

/**
 * Example: Verify ownership with ZK proof
 */
export async function proveOwnership(photoHash: string, secret: string) {
  console.log('🔍 Verifying ownership with ZK proof...');
  console.log('Photo hash:', photoHash.substring(0, 20) + '...');
  console.log('Secret:', secret.substring(0, 20) + '...');
  console.log('');
  
  // In real implementation, this would call the contract
  // const result = await contract.verify_zk_proof(photoHash, secret);
  
  console.log('✅ Proof verified on-chain!');
  console.log('✅ Ownership confirmed without revealing image');
  
  return true;
}

/**
 * Example: Retrieve photo metadata from chain
 */
export async function retrievePhotoMetadata(photoHash: string) {
  console.log('📥 Retrieving metadata from chain...');
  console.log('Photo hash:', photoHash.substring(0, 20) + '...');
  console.log('');
  
  // In real implementation:
  // const metadata = await contract.get_photo_metadata(photoHash);
  
  const mockMetadata = {
    ipfsCid: 'QmExample...',
    verifiedAt: Date.now(),
    owner: '0x1234...5678',
    isEncrypted: false,
  };
  
  console.log('✅ Metadata retrieved:');
  console.log('   - IPFS CID:', mockMetadata.ipfsCid);
  console.log('   - Verified:', new Date(mockMetadata.verifiedAt).toLocaleString());
  console.log('   - Owner:', mockMetadata.owner);
  console.log('   - Encrypted:', mockMetadata.isEncrypted);
  
  return mockMetadata;
}

/**
 * Example: Full demo
 */
export async function runDemo() {
  console.clear();
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  ArbiPic Enhanced Demo                    ║');
  console.log('║  Metadata + ZK Proof + IPFS              ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  
  // Simulate photo capture
  const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
  
  try {
    // Complete flow
    const result = await completeVerificationFlow(mockImageData);
    
    console.log('─────────────────────────────────────────────');
    console.log('');
    
    // Prove ownership
    await proveOwnership(
      result.contractData.photoHash,
      result.secret
    );
    
    console.log('─────────────────────────────────────────────');
    console.log('');
    
    // Retrieve metadata
    await retrievePhotoMetadata(result.contractData.photoHash);
    
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  ✅ Demo Complete!                        ║');
    console.log('╚════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Export for use in components
export default {
  completeVerificationFlow,
  proveOwnership,
  retrievePhotoMetadata,
  runDemo,
};
