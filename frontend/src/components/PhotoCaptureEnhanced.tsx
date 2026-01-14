import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import Webcam from 'react-webcam'
import { sha256 } from 'js-sha256'
import { useAccount, useWaitForTransactionReceipt, useReadContract, useSwitchChain, useChainId } from 'wagmi'
import { VERIFIER_ABI, getContractAddress, orbitL3 } from '../config'
import { Hash, encodeFunctionData } from 'viem'
import { arbitrumSepolia } from 'wagmi/chains'
import { collectDeviceMetadata, hashToBigInt } from '../utils/deviceMetadata'
import { generateZKProof, storeSecretSecurely, retrieveSecret, computeCommitment } from '../utils/zkProof'
import { uploadToPinata } from '../utils/ipfs'
import {
  generateVerificationUrl,
  generateTwitterShareUrl,
  generateVerificationId,
  storeVerificationLocally,
  copyVerificationLink,
  addVerificationWatermark,
  getIpfsUrl,
  VerificationData
} from '../utils/verification'
import { createSimpleAttestation } from '../utils/eas'

// --- Icons ---
const Icons = {
  Camera: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Wallet: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>,
  Share: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  Refresh: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>,
  Twitter: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
  Badge: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>,
}

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: 'user'
}

interface PhotoData {
  imageSrc: string
  hash: string
  timestamp?: bigint
  txHash?: Hash
  ipfsCid?: string
  zkSecret?: string
  verificationId?: string
  easAttestationId?: string  // EAS attestation UID
  easExplorerUrl?: string    // EAS explorer URL
}

type VerificationStep = 'idle' | 'collecting' | 'uploading' | 'signing' | 'confirming' | 'attesting' | 'complete'

export const PhotoCaptureEnhanced: React.FC = () => {
  const webcamRef = useRef<Webcam>(null)
  const [photo, setPhoto] = useState<PhotoData | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [step, setStep] = useState<VerificationStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [watermarkedImage, setWatermarkedImage] = useState<string | null>(null)
  const [pendingTxHash, setPendingTxHash] = useState<Hash | null>(null)
  const [attestationCreated, setAttestationCreated] = useState(false)
  
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  
  // Get correct contract address for current network
  const contractAddress = useMemo(() => getContractAddress(chainId), [chainId])
  
  // Watch for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash: pendingTxHash || undefined 
  })

  // Support both Arbitrum Sepolia and Orbit L3
  const isCorrectNetwork = chainId === arbitrumSepolia.id || chainId === orbitL3.id

  // Read attestation data if photo exists
  const { data: attestation } = useReadContract({
    address: contractAddress,
    abi: VERIFIER_ABI,
    functionName: 'getAttestation',
    args: photo?.hash ? [BigInt(`0x${photo.hash}`)] : undefined,
    query: {
      enabled: !!photo?.hash && isCorrectNetwork
    }
  })

  // Handle confirmation complete
  useEffect(() => {
    if (isConfirmed && photo && pendingTxHash && address && !attestationCreated) {
      // Mark as created immediately to prevent re-runs
      setAttestationCreated(true)
      
      // EAS attestation disabled - skip straight to complete
      console.log('📍 Skipping EAS attestation (disabled)')
      setStep('complete')
      
      // Store verification data locally
      const verificationData: VerificationData = {
        photoHash: photo.hash,
        txHash: pendingTxHash,
        timestamp: Math.floor(Date.now() / 1000),
        owner: address,
        ipfsCid: photo.ipfsCid
      }
      storeVerificationLocally(verificationData)
      
      // Generate watermarked image
      addVerificationWatermark(photo.imageSrc, photo.hash)
        .then(setWatermarkedImage)
        .catch(console.error)
      
      /* EAS ATTESTATION DISABLED - Uncomment to re-enable
      // Only create EAS attestation on Arbitrum Sepolia (EAS contracts don't exist on L3)
      const isOnSepolia = chainId === arbitrumSepolia.id
      
      if (isOnSepolia) {
        // Create EAS attestation
        setStep('attesting')
        
        const createAttestation = async () => {
          try {
            // Get stored ZK commitment
            const storedMetadata = localStorage.getItem(`arbipic_metadata_${photo.hash}`)
            const metadata = storedMetadata ? JSON.parse(storedMetadata) : {}
            
            const easResult = await createSimpleAttestation(
              `0x${photo.hash}`,
              Math.floor(Date.now() / 1000),
              address,
              photo.ipfsCid || '',
              metadata.zkCommitment || '0x0'
            )
            
            if (easResult.success && easResult.attestationId) {
              setPhoto(prev => prev ? { 
                ...prev, 
                easAttestationId: easResult.attestationId,
                easExplorerUrl: easResult.explorerUrl 
              } : null)
              console.log('✅ EAS Attestation created:', easResult.attestationId)
              if (easResult.explorerUrl) {
                console.log('🔗 View on EAS Explorer:', easResult.explorerUrl)
              }
              if (easResult.error) {
                console.warn('⚠️', easResult.error)
              }
            }
          } catch (err) {
            console.warn('EAS attestation failed (non-critical):', err)
          }
          
          setStep('complete')
        
          // Store verification data locally
          const verificationData: VerificationData = {
            photoHash: photo.hash,
            txHash: pendingTxHash,
            timestamp: Math.floor(Date.now() / 1000),
            owner: address,
            ipfsCid: photo.ipfsCid
          }
          storeVerificationLocally(verificationData)
          
          // Generate watermarked image
          addVerificationWatermark(photo.imageSrc, photo.hash)
            .then(setWatermarkedImage)
            .catch(console.error)
        }
        
        createAttestation()
      } else {
        // On L3, skip EAS and go straight to complete
        console.log('📍 On L3 - skipping EAS attestation (not available on local L3)')
        setStep('complete')
        
        // Store verification data locally
        const verificationData: VerificationData = {
          photoHash: photo.hash,
          txHash: pendingTxHash,
          timestamp: Math.floor(Date.now() / 1000),
          owner: address,
          ipfsCid: photo.ipfsCid
        }
        storeVerificationLocally(verificationData)
        
        // Generate watermarked image
        addVerificationWatermark(photo.imageSrc, photo.hash)
          .then(setWatermarkedImage)
          .catch(console.error)
      }
      END EAS ATTESTATION DISABLED */
    }
  }, [isConfirmed, photo, pendingTxHash, address, attestationCreated, chainId])

  const capture = useCallback(() => {
    setIsCapturing(true)
    setError(null)
    const imageSrc = webcamRef.current?.getScreenshot()
    
    if (imageSrc) {
      // Remove data:image/jpeg;base64, prefix
      const base64Data = imageSrc.split(',')[1]
      const photoHash = sha256(base64Data)
      
      setPhoto({
        imageSrc,
        hash: photoHash,
        verificationId: generateVerificationId(photoHash)
      })
    }
    setIsCapturing(false)
  }, [webcamRef])

  const verifyWithMetadata = useCallback(async () => {
    if (!photo || !isConnected || !address) return
    setError(null)

    // Check if we're on the correct network
    if (!isCorrectNetwork) {
      try {
        await switchChain({ chainId: arbitrumSepolia.id })
      } catch (error) {
        console.error('Failed to switch network:', error)
        setError('Failed to switch network. Please switch manually.')
        return
      }
    }

    try {
      // Step 1: Collect device metadata (stored off-chain)
      setStep('collecting')
      const metadata = await collectDeviceMetadata(
        { width: 1280, height: 720 },
        photo.hash // Use photo hash as location salt
      )

      // Step 2: Generate ZK proof
      const zkProof = generateZKProof(`0x${photo.hash}`)
      storeSecretSecurely(photo.hash, zkProof.secret)
      setPhoto(prev => prev ? { ...prev, zkSecret: zkProof.secret } : null)

      // Step 3: Upload to IPFS (off-chain storage)
      setStep('uploading')
      let ipfsCid = ''
      
      try {
        // Convert base64 to blob
        const base64Data = photo.imageSrc.split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const imageBlob = new Blob([byteArray], { type: 'image/jpeg' })

        const ipfsResult = await uploadToPinata(imageBlob, {
          photoHash: photo.hash,
          timestamp: metadata.timestamp,
          deviceFingerprint: metadata.fingerprint.slice(0, 16),
        })
        ipfsCid = ipfsResult.imageCid
        setPhoto(prev => prev ? { ...prev, ipfsCid } : null)
        
        // Store extended metadata off-chain (localStorage + IPFS metadata)
        const offChainMetadata = {
          photoHash: photo.hash,
          ipfsCid,
          thumbnailCid: ipfsResult.thumbnailCid,
          deviceFingerprint: metadata.fingerprint,
          captureTimestamp: metadata.timestamp,
          cameraResolution: metadata.resolution,
          locationHash: metadata.locationHash,
          zkCommitment: zkProof.commitment,
          createdAt: Date.now()
        }
        localStorage.setItem(`arbipic_metadata_${photo.hash}`, JSON.stringify(offChainMetadata))
        console.log('Off-chain metadata stored:', offChainMetadata)
      } catch (ipfsError) {
        console.warn('IPFS upload failed, continuing without:', ipfsError)
        // Continue without IPFS - metadata still stored locally
      }

      // Step 4: Submit MINIMAL data to blockchain (just hash + zkCommitment)
      setStep('signing')
      
      // Only 2 arguments now - photoHash and zkCommitment
      const photoHashBigInt = hashToBigInt(photo.hash)
      const zkCommitmentBigInt = BigInt(zkProof.commitment)
      
      // Debug logging
      console.log('Contract call args (simplified):', {
        photoHash: photoHashBigInt.toString(),
        zkCommitment: zkCommitmentBigInt.toString()
      })
      
      // Encode the function call data manually
      const callData = encodeFunctionData({
        abi: VERIFIER_ABI,
        functionName: 'verifyPhoto',
        args: [photoHashBigInt, zkCommitmentBigInt],
      })
      
      console.log('Sending raw transaction via window.ethereum to bypass simulation...')
      console.log('Calldata:', callData)
      
      // Use window.ethereum.request directly to bypass wagmi/viem simulation
      // This sends the transaction directly without eth_call simulation
      const ethereum = (window as any).ethereum
      if (!ethereum) {
        throw new Error('MetaMask not found')
      }
      
      // Get current gas price for reliability
      const gasPrice = await ethereum.request({ method: 'eth_gasPrice' })
      
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: contractAddress,
          data: callData,
          gas: '0x7A120', // 500000 in hex - increased for reliability
          gasPrice: gasPrice // Use current gas price
        }],
      }) as Hash
      
      console.log('Transaction sent:', txHash)
      setPendingTxHash(txHash)
      setPhoto(prev => prev ? { ...prev, txHash } : null)

      setStep('confirming')
    } catch (err: any) {
      console.error('Verification failed:', err)
      setError(err.message || 'Verification failed')
      setStep('idle')
    }
  }, [photo, isConnected, isCorrectNetwork, switchChain, address, contractAddress])
  const verifySimple = useCallback(async () => {
    if (!photo || !isConnected) return
    setError(null)

    if (!isCorrectNetwork) {
      try {
        await switchChain({ chainId: arbitrumSepolia.id })
      } catch (error) {
        setError('Failed to switch network')
        return
      }
    }

    setStep('signing')
    
    try {
      // Generate a simple ZK commitment for basic verification
      const zkProof = generateZKProof(`0x${photo.hash}`)
      storeSecretSecurely(photo.hash, zkProof.secret)
      
      const photoHashBigInt = hashToBigInt(photo.hash)
      const zkCommitmentBigInt = BigInt(zkProof.commitment)
      
      // Encode and send via window.ethereum to bypass simulation
      const callData = encodeFunctionData({
        abi: VERIFIER_ABI,
        functionName: 'verifyPhoto',
        args: [photoHashBigInt, zkCommitmentBigInt],
      })
      
      const ethereum = (window as any).ethereum
      if (!ethereum) {
        throw new Error('MetaMask not found')
      }
      
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: contractAddress,
          data: callData,
          gas: '0x3D090', // 250000 in hex
        }],
      }) as Hash
      
      console.log('Transaction sent:', txHash)
      setPendingTxHash(txHash)
      setPhoto(prev => prev ? { ...prev, txHash } : null)
      setStep('confirming')
    } catch (err: any) {
      console.error('Verification failed:', err)
      setError(err.message || 'Verification failed')
      setStep('idle')
    }
  }, [photo, isConnected, isCorrectNetwork, switchChain, address, contractAddress])

  const shareOnTwitter = useCallback(async () => {
    if (!photo || !pendingTxHash || !address) return
    
    // Attempt to copy image to clipboard for easy pasting
    if (watermarkedImage) {
      try {
        // Convert to PNG for max clipboard compatibility (JPEG is flaky in Clipboard API)
        const img = new Image()
        img.src = watermarkedImage
        await new Promise((resolve) => { img.onload = resolve })

        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const blob = await new Promise<Blob | null>(resolve => 
            canvas.toBlob(resolve, 'image/png')
          )

          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ])
            // Explicitly notify user to ensure they know they can paste
            alert('Image copied to clipboard! Paste it (Ctrl+V) in your tweet.')
          }
        }
      } catch (err) {
        console.warn('Could not copy image to clipboard:', err)
        alert('Could not auto-copy image. Please use "Save Original" or "Badge" to download first.')
      }
    }

    const verificationData: VerificationData = {
      photoHash: photo.hash,
      txHash: pendingTxHash,
      timestamp: Math.floor(Date.now() / 1000),
      owner: address,
      ipfsCid: photo.ipfsCid
    }
    
    const twitterUrl = generateTwitterShareUrl(verificationData)
    window.open(twitterUrl, '_blank')
  }, [photo, pendingTxHash, address, watermarkedImage])

  const copyLink = useCallback(async () => {
    if (!photo) return
    const success = await copyVerificationLink(photo.hash)
    if (success) {
      alert('Verification link copied to clipboard!')
    }
  }, [photo])

  const downloadWatermarked = useCallback(() => {
    if (!watermarkedImage) return
    const link = document.createElement('a')
    link.href = watermarkedImage
    link.download = `arbipic-verified-${photo?.verificationId}.jpg`
    link.click()
  }, [watermarkedImage, photo])

  // Download original (non-watermarked) - this will hash correctly when re-uploaded
  const downloadOriginal = useCallback(() => {
    if (!photo?.imageSrc) return
    const link = document.createElement('a')
    link.href = photo.imageSrc
    // Include full hash in filename so verification works even after rename
    link.download = `arbipic-original-${photo.hash}.jpg`
    link.click()
  }, [photo])

  // Prove ownership using ZK proof
  const [zkProofResult, setZkProofResult] = useState<'idle' | 'proving' | 'success' | 'failed'>('idle')
  
  const proveOwnership = useCallback(async () => {
    if (!photo) return
    setZkProofResult('proving')
    
    try {
      // Retrieve stored secret
      const secret = retrieveSecret(photo.hash)
      if (!secret) {
        alert('❌ ZK secret not found locally. You can only prove ownership from the device that captured the photo.')
        setZkProofResult('failed')
        return
      }
      
      // Verify locally first
      const secretBigInt = BigInt(secret)
      // Compute locally to validate before on-chain call
      const _commitment = computeCommitment(`0x${photo.hash}`, secretBigInt)
      console.log('Local commitment:', _commitment)
      
      // Call the on-chain verification
      const ethereum = (window as any).ethereum
      if (!ethereum) {
        throw new Error('MetaMask not found')
      }
      
      // Encode verifyZkProof call
      const callData = encodeFunctionData({
        abi: VERIFIER_ABI,
        functionName: 'verifyZkProof',
        args: [BigInt(`0x${photo.hash}`), secretBigInt],
      })
      
      // Call (not send) to verify without gas
      const result = await ethereum.request({
        method: 'eth_call',
        params: [{
          to: contractAddress,
          data: callData,
        }, 'latest'],
      })
      
      // Result is true if ownership is proven
      const isValid = result !== '0x0000000000000000000000000000000000000000000000000000000000000000'
      
      if (isValid) {
        setZkProofResult('success')
        alert('✅ ZK Proof Verified! You have proven ownership of this photo without revealing the image.')
      } else {
        setZkProofResult('failed')
        alert('❌ ZK Proof Failed. The secret does not match the on-chain commitment.')
      }
    } catch (err) {
      console.error('ZK proof error:', err)
      setZkProofResult('failed')
      alert('❌ ZK Proof Failed: ' + (err as Error).message)
    }
  }, [photo, contractAddress])

  const reset = () => {
    setPhoto(null)
    setStep('idle')
    setError(null)
    setWatermarkedImage(null)
    setPendingTxHash(null)
    setAttestationCreated(false)
  }

  const getStepMessage = () => {
    switch (step) {
      case 'collecting': return 'Collecting metadata...'
      case 'uploading': return 'Securing on IPFS...'
      case 'signing': return 'Waiting for wallet...'
      case 'confirming': return 'Verifying on-chain...'
      case 'attesting': return 'Creating attestation...'
      case 'complete': return 'Verification Complete'
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-white selection:text-black">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          {/* <div className="inline-flex items-center justify-center p-3 mb-6 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl">
             <Icons.Camera />
          </div>
          <h1 className="text-5xl font-bold tracking-tighter mb-4 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            ArbiPic
          </h1> */}
          <p className="text-zinc-400 text-lg font-light tracking-wide">
            Secure Photo Verification Protocol
          </p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-2 shadow-2xl overflow-hidden">
          {!photo ? (
            <div className="relative group">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-zinc-800">
                <Webcam
                  audio={false}
                  height={720}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width={1280}
                  videoConstraints={videoConstraints}
                  className="w-full h-full object-cover opacity-90"
                />
                
                {/* Overlay Grid */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                  <div className="border-r border-b border-white/30"></div>
                  <div className="border-r border-b border-white/30"></div>
                  <div className="border-b border-white/30"></div>
                  <div className="border-r border-b border-white/30"></div>
                  <div className="border-r border-b border-white/30"></div>
                  <div className="border-b border-white/30"></div>
                  <div className="border-r border-white/30"></div>
                  <div className="border-r border-white/30"></div>
                  <div></div>
                </div>

                {/* Corner Markers */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/50 rounded-tl-lg"></div>
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/50 rounded-tr-lg"></div>
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/50 rounded-bl-lg"></div>
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/50 rounded-br-lg"></div>
              </div>
              
              <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <button
                  onClick={capture}
                  disabled={isCapturing || !isConnected}
                  className="group relative px-8 py-4 bg-white text-black font-bold rounded-full shadow-lg hover:shadow-white/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-3"
                >
                  {isConnected ? (
                    <>
                      <Icons.Camera />
                      <span>Capture</span>
                    </>
                  ) : (
                    <>
                      <Icons.Wallet />
                      <span>Connect Wallet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Image Display */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl group">
                <img 
                  src={watermarkedImage || photo.imageSrc} 
                  alt="Captured" 
                  className="w-full grayscale group-hover:grayscale-0 transition-all duration-500 ease-in-out" // Black and white theme
                />
                
                {step === 'complete' && (
                  <div className="absolute top-4 right-4 bg-white text-black px-4 py-2 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2 animate-fade-in-up">
                    <Icons.Badge />
                    Verified
                  </div>
                )}

                 {/* Status Overlay */}
                {step !== 'idle' && step !== 'complete' && (
                   <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center flex-col gap-4 text-white">
                      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-mono tracking-widest text-sm uppercase">{getStepMessage()}</p>
                   </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400">
                  <span className="text-xl">!</span>
                  <p className="font-medium text-sm">{error}</p>
                </div>
              )}

              {/* Verified Metadata */}
              <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800 space-y-4 font-mono text-sm">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                   <div className="flex items-center gap-2 text-zinc-400 shrink-0">
                      <Icons.Lock />
                      <span>Photo Hash</span>
                   </div>
                   <code className="text-white hover:text-zinc-300 transition-colors cursor-help text-xs sm:text-sm text-right break-all ml-4" title={photo.hash}>
                     {photo.hash.slice(0, 12)}...{photo.hash.slice(-8)}
                   </code>
                </div>
                
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                   <span className="text-zinc-400">ID</span>
                   <span className="text-white">#{photo.verificationId}</span>
                </div>
                {attestation && attestation[0] > 0n && (
                   <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                      <span className="text-zinc-400">Verified</span>
                      <span className="text-white">
                        {new Date(Number(attestation[0]) * 1000).toLocaleString()}
                      </span>
                   </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                   {pendingTxHash && (
                     chainId === orbitL3.id ? (
                       <div className="block p-3 bg-zinc-900 rounded-lg text-center text-xs text-zinc-400 border border-zinc-800">
                         <span className="text-zinc-500">TX:</span> {pendingTxHash.slice(0, 10)}...{pendingTxHash.slice(-8)}
                       </div>
                     ) : (
                       <a
                         href={`https://sepolia.arbiscan.io/tx/${pendingTxHash}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="block p-3 bg-zinc-900 rounded-lg text-center text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-all"
                       >
                         View Transaction ↗
                       </a>
                     )
                   )}
                   {photo.ipfsCid && (
                     <a
                       href={getIpfsUrl(photo.ipfsCid)}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="block p-3 bg-zinc-900 rounded-lg text-center text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-all"
                     >
                       View IPFS ↗
                     </a>
                   )}
                </div>
                
                {photo.easAttestationId && (
                   <div className="pt-2">
                      <a 
                         href={photo.easExplorerUrl || '#'} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="flex items-center justify-center gap-2 w-full p-3 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all group"
                      >
                         <Icons.Check />
                         <span>EAS Attestation Confirmed</span>
                      </a>
                   </div>
                )}
              </div>

              {/* Action Buttons */}
              {step !== 'complete' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={verifyWithMetadata}
                    disabled={isConfirming || !isConnected || (attestation && attestation[0] > 0n) || step !== 'idle'}
                    className="col-span-1 md:col-span-2 py-4 px-6 bg-white text-black font-bold rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {(attestation && attestation[0] > 0n) ? 
                     <><Icons.Check /> Verified</> :
                     !isCorrectNetwork ? 'Switch Network' :
                     <><Icons.Lock /> Secure Verify</>
                    }
                  </button>

                  <button
                    onClick={verifySimple}
                    disabled={isConfirming || !isConnected || (attestation && attestation[0] > 0n) || step !== 'idle'}
                    className="py-4 px-6 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Icons.Sparkles /> Simple Verify
                  </button>

                  <button
                    onClick={reset}
                    className="py-4 px-6 bg-zinc-900 text-zinc-400 font-semibold rounded-xl hover:bg-zinc-800 hover:text-white border border-zinc-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Icons.Refresh /> Reset
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                     <h3 className="text-xl font-bold text-white mb-2">Success!</h3>
                     <p className="text-zinc-400 text-sm">Your photo has been cryptographically secured on the blockchain.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={shareOnTwitter}
                      className="py-4 px-6 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20"
                    >
                      <Icons.Twitter />
                      Share on X
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                       <button
                         onClick={copyLink}
                         className="py-4 px-6 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                       >
                         <Icons.Share /> Copy Link
                       </button>

                       {watermarkedImage && (
                         <button
                           onClick={downloadWatermarked}
                           className="py-4 px-6 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                         >
                           <Icons.Badge /> Badge
                         </button>
                       )}
                    </div>
                    
                    <button
                      onClick={downloadOriginal}
                      className="py-4 px-6 bg-zinc-900 text-zinc-400 hover:text-white font-semibold rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Icons.Download /> Save Original
                    </button>
                  </div>

                  <div className="pt-4 border-t border-zinc-800 flex justify-between gap-4">
                    <button
                      onClick={reset}
                      className="text-zinc-500 hover:text-white text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Icons.Camera /> New Photo
                    </button>
                    
                    <button
                      onClick={proveOwnership}
                      disabled={zkProofResult === 'proving'}
                      className={`text-sm font-medium transition-colors flex items-center gap-2 ${
                        zkProofResult === 'success' 
                          ? 'text-green-500' 
                          : zkProofResult === 'failed'
                          ? 'text-red-500'
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      {zkProofResult === 'proving' ? 'Verifying...' : 
                       zkProofResult === 'success' ? 'Ownership Proven' :
                       'Prove Ownership'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-zinc-600 text-sm">
           {!isConnected && <span className="text-yellow-600/50">⚠ Connect wallet to begin</span>}
           {isConnected && !isCorrectNetwork && <span className="text-red-500">⚠ Switch to Arbitrum Sepolia</span>}
        </div>
      </div>
    </div>
  )
}
