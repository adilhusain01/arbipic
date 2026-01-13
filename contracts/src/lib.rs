// Copyright 2025, ArbiPic
// For licensing, see MIT OR Apache-2.0

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::storage::*;
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
};

// Minimal photo attestation - only what's needed for proof
#[storage]
pub struct PhotoAttestation {
    verified_at: StorageU256,     // Block timestamp when verified
    owner: StorageAddress,        // Photo owner address
    zk_commitment: StorageU256,   // ZK commitment for ownership proof
}

#[storage]
#[entrypoint]
pub struct Verifier {
    // Photo attestations: photoHash => attestation
    attestations: StorageMap<U256, PhotoAttestation>,
    
    // Owner photo count for tracking
    owner_photo_count: StorageMap<Address, StorageU256>,
    
    // Contract owner
    owner: StorageAddress,
    
    // Total photos verified
    photo_count: StorageU256,
}

#[public]
impl Verifier {
    /// Initialize the contract with the deployer as owner
    pub fn init(&mut self) -> Result<(), Vec<u8>> {
        self.owner.set(self.vm().msg_sender());
        self.photo_count.set(U256::ZERO);
        Ok(())
    }

    /// Verify a photo - minimal on-chain storage
    /// All other metadata (IPFS CID, device info, etc.) stored off-chain
    pub fn verify_photo(&mut self, photo_hash: U256, zk_commitment: U256) -> Result<U256, Vec<u8>> {
        let timestamp = U256::from(self.vm().block_timestamp());
        let sender = self.vm().msg_sender();
        
        // Store attestation
        let mut attestation = self.attestations.setter(photo_hash);
        attestation.verified_at.set(timestamp);
        attestation.owner.set(sender);
        attestation.zk_commitment.set(zk_commitment);
        
        // Track owner's photo count
        let count = self.owner_photo_count.get(sender);
        self.owner_photo_count.setter(sender).set(count + U256::from(1));
        
        // Increment total counter
        let total = self.photo_count.get();
        self.photo_count.set(total + U256::from(1));
        
        Ok(timestamp)
    }

    /// Get attestation for a photo
    pub fn get_attestation(&self, photo_hash: U256) -> Result<(U256, Address, U256), Vec<u8>> {
        let attestation = self.attestations.getter(photo_hash);
        Ok((
            attestation.verified_at.get(),
            attestation.owner.get(),
            attestation.zk_commitment.get(),
        ))
    }

    /// Verify ZK proof of ownership
    pub fn verify_zk_proof(&self, photo_hash: U256, secret: U256) -> Result<bool, Vec<u8>> {
        let attestation = self.attestations.getter(photo_hash);
        let stored_commitment = attestation.zk_commitment.get();
        
        // Compute commitment from secret using keccak256(photoHash || secret)
        let computed = self.compute_commitment(photo_hash, secret);
        
        Ok(computed == stored_commitment)
    }
    
    /// Helper: Compute ZK commitment using keccak256
    fn compute_commitment(&self, photo_hash: U256, secret: U256) -> U256 {
        use stylus_sdk::crypto::keccak;
        
        let mut data = [0u8; 64];
        // Copy photo_hash bytes (big endian, 32 bytes)
        let photo_bytes = photo_hash.to_be_bytes::<32>();
        data[..32].copy_from_slice(&photo_bytes);
        // Copy secret bytes (big endian, 32 bytes)  
        let secret_bytes = secret.to_be_bytes::<32>();
        data[32..64].copy_from_slice(&secret_bytes);
        
        // Keccak256 hash
        let hash = keccak(&data);
        U256::from_be_bytes(hash.0)
    }

    /// Check if a photo is verified
    pub fn is_verified(&self, photo_hash: U256) -> Result<bool, Vec<u8>> {
        Ok(self.attestations.getter(photo_hash).verified_at.get() > U256::ZERO)
    }

    /// Get photo owner
    pub fn get_owner_of(&self, photo_hash: U256) -> Result<Address, Vec<u8>> {
        Ok(self.attestations.getter(photo_hash).owner.get())
    }

    /// Get owner's photo count
    pub fn get_owner_photo_count(&self, owner: Address) -> Result<U256, Vec<u8>> {
        Ok(self.owner_photo_count.get(owner))
    }

    /// Get total photos verified
    pub fn get_photo_count(&self) -> Result<U256, Vec<u8>> {
        Ok(self.photo_count.get())
    }

    /// Get contract owner
    pub fn get_contract_owner(&self) -> Result<Address, Vec<u8>> {
        Ok(self.owner.get())
    }
}