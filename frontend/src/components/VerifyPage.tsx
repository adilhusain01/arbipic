import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { sha256 } from 'js-sha256'
import { useReadContract, useChainId } from 'wagmi'
import { VERIFIER_ABI, getContractAddress, PINATA_GATEWAY, orbitL3 } from '../config'
import { generateVerificationId, generateContractUrl, getLocalVerification } from '../utils/verification'
import { retrieveSecret } from '../utils/zkProof'
import { encodeFunctionData } from 'viem'
import { arbitrumSepolia } from 'wagmi/chains'
import { Header } from './Header'

interface PhotoMetadata {
  ipfsCid: string
  verifiedAt: bigint
  owner: string
  isEncrypted: boolean
}

export const VerifyPage: React.FC = () => {
  const { verificationId } = useParams<{ verificationId?: string }>()
  
  const [inputHash, setInputHash] = useState('')
  const [searchHash, setSearchHash] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  
  // ZK Proof state
  const [zkProofStatus, setZkProofStatus] = useState<'idle' | 'proving' | 'success' | 'failed'>('idle')
  const [hasSecret, setHasSecret] = useState(false)

  // Network awareness
  const chainId = useChainId()
  const contractAddress = useMemo(() => getContractAddress(chainId), [chainId])
  const networkName = chainId === orbitL3.id ? 'Orbit L3' : 'Arbitrum Sepolia'
  const isOnL3 = chainId === orbitL3.id

  // Try to get full hash from URL param or local storage
  useEffect(() => {
    if (verificationId) {
      // Check local storage for full hash
      const localData = getLocalVerification(verificationId)
      if (localData) {
        setSearchHash(localData.photoHash)
      } else {
        // Just use the ID - we'll need full hash for on-chain lookup
        setInputHash(verificationId)
      }
    }
  }, [verificationId])

  // Check if user has the secret for this photo (means they're the owner)
  useEffect(() => {
    if (searchHash) {
      const secret = retrieveSecret(searchHash)
      setHasSecret(!!secret)
      setZkProofStatus('idle')
    }
  }, [searchHash])

  // Prove ownership using ZK proof
  const proveOwnership = useCallback(async () => {
    if (!searchHash) return
    setZkProofStatus('proving')
    
    try {
      const secret = retrieveSecret(searchHash)
      if (!secret) {
        setZkProofStatus('failed')
        return
      }
      
      const secretBigInt = BigInt(secret)
      
      // Encode verifyZkProof call
      const callData = encodeFunctionData({
        abi: VERIFIER_ABI,
        functionName: 'verifyZkProof',
        args: [BigInt(`0x${searchHash}`), secretBigInt],
      })
      
      const ethereum = (window as any).ethereum
      if (!ethereum) {
        throw new Error('MetaMask not found')
      }
      
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
      
      setZkProofStatus(isValid ? 'success' : 'failed')
    } catch (err) {
      console.error('ZK proof error:', err)
      setZkProofStatus('failed')
    }
  }, [searchHash, contractAddress])

  // Read on-chain verification status
  const { data: isVerified, isLoading: isCheckingVerification } = useReadContract({
    address: contractAddress,
    abi: VERIFIER_ABI,
    functionName: 'isVerified',
    args: searchHash ? [BigInt(`0x${searchHash}`)] : undefined,
    query: {
      enabled: !!searchHash
    }
  })

  // Read attestation timestamp
  const { data: attestation } = useReadContract({
    address: contractAddress,
    abi: VERIFIER_ABI,
    functionName: 'getAttestation',
    args: searchHash ? [BigInt(`0x${searchHash}`)] : undefined,
    query: {
      enabled: !!searchHash
    }
  })

  // Read full metadata (using getAttestation)
  const { data: metadata } = useReadContract({
    address: contractAddress,
    abi: VERIFIER_ABI,
    functionName: 'getAttestation',
    args: searchHash ? [BigInt(`0x${searchHash}`)] : undefined,
    query: {
      enabled: !!searchHash
    }
  }) as { data: [bigint, `0x${string}`, bigint] | undefined }

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setUploadedImage(dataUrl)
      
      // Try to extract FULL hash from original image filename (e.g., "arbipic-original-abc123...xyz.jpg")
      const originalMatch = file.name.match(/arbipic-original-([a-f0-9]{64})/i)
      if (originalMatch) {
        const fullHash = originalMatch[1]
        console.log('Found full hash from original filename:', fullHash)
        setSearchHash(fullHash)
        setInputHash(fullHash)
        return
      }
      
      // Try to extract verification ID from watermarked filename (e.g., "arbipic-verified-7362dd92de99.jpg")
      const verifiedMatch = file.name.match(/arbipic-verified-([a-f0-9]+)/i)
      if (verifiedMatch) {
        const verificationId = verifiedMatch[1]
        // Look up the full hash from localStorage
        const localData = getLocalVerification(verificationId)
        if (localData) {
          console.log('Found original hash from verification ID:', localData.photoHash)
          setSearchHash(localData.photoHash)
          setInputHash(localData.photoHash)
          return
        }
      }
      
      // Compute hash of uploaded image - this will match for ORIGINAL downloads
      const base64Data = dataUrl.split(',')[1]
      const hash = sha256(base64Data)
      console.log('Using computed hash:', hash)
      setSearchHash(hash)
      setInputHash(hash)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleHashSearch = useCallback(() => {
    if (!inputHash) return
    setIsSearching(true)
    
    // Clean the input
    let cleanHash = inputHash.startsWith('0x') ? inputHash.slice(2) : inputHash
    
    // If it's a short verification ID (12 chars or less), try to look up full hash
    if (cleanHash.length <= 12) {
      const localData = getLocalVerification(cleanHash)
      if (localData) {
        console.log('Found full hash from verification ID:', localData.photoHash)
        cleanHash = localData.photoHash
      } else {
        console.log('Verification ID not found in local storage:', cleanHash)
      }
    }
    
    setSearchHash(cleanHash)
    
    setTimeout(() => setIsSearching(false), 1000)
  }, [inputHash])

  const handlePaste = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read()
      for (const item of clipboardItems) {
        // Check for image
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType(item.types.find(t => t.startsWith('image/'))!)
          const reader = new FileReader()
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string
            setUploadedImage(dataUrl)
            const base64Data = dataUrl.split(',')[1]
            const hash = sha256(base64Data)
            setSearchHash(hash)
            setInputHash(hash)
          }
          reader.readAsDataURL(blob)
          return
        }
        // Check for text (hash)
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain')
          const text = await blob.text()
          if (text.length === 64 || (text.startsWith('0x') && text.length === 66)) {
            setInputHash(text)
            handleHashSearch()
          }
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err)
    }
  }, [handleHashSearch])

  // Parse attestation data (now returns [timestamp, owner, zkCommitment])
  const parsedMetadata: PhotoMetadata | null = metadata ? {
    ipfsCid: '', // Not stored on-chain anymore, will get from localStorage
    verifiedAt: metadata[0],
    owner: metadata[1] as string,
    isEncrypted: false // Not stored on-chain
  } : null

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Header />
      <div className="py-12 relative">
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-black to-black pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
              Verify Authenticity
            </h1>
            <p className="text-zinc-400 text-lg font-light">
              Cryptographically verify photos on the Arbitrum blockchain
            </p>
          </div>

        {/* Search Box */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="space-y-6">
            {/* Upload or Paste Image */}
            <div className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 group ${
              uploadedImage 
                ? 'border-zinc-700 bg-zinc-900/50' 
                : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
            }`}>
              {uploadedImage ? (
                <div className="relative inline-block">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded for verification" 
                    className="max-h-64 rounded-lg shadow-2xl border border-zinc-700"
                  />
                  <button
                    onClick={() => { setUploadedImage(null); setSearchHash(null); }}
                    className="absolute -top-3 -right-3 bg-zinc-800 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-zinc-700 border border-zinc-600 shadow-lg transition-all"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label 
                    htmlFor="image-upload"
                    className="cursor-pointer block"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 bg-zinc-800 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 border border-zinc-700">
                      🖼️
                    </div>
                    <p className="text-white font-semibold text-lg mb-2">
                      Drop an image here
                    </p>
                    <p className="text-zinc-500 text-sm">
                      We'll verify its hash against the blockchain
                    </p>
                  </label>
                  
                  <div className="mt-6">
                    <button
                      onClick={handlePaste}
                      className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full text-sm font-medium transition-all border border-zinc-700"
                    >
                      📋 Paste from Clipboard
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Separator */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-zinc-800"></div>
              <span className="text-zinc-600 text-xs font-mono tracking-widest uppercase">Or Verify by Hash</span>
              <div className="flex-1 h-px bg-zinc-800"></div>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={inputHash}
                onChange={(e) => setInputHash(e.target.value)}
                placeholder="0x..."
                className="flex-1 px-5 py-4 bg-black border border-zinc-800 rounded-xl focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono text-sm text-white placeholder-zinc-700 transition-all"
              />
              <button
                onClick={handleHashSearch}
                disabled={!inputHash || isSearching}
                className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-all shadow-lg hover:shadow-white/10"
              >
                {isSearching ? '...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {searchHash && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up">
            {/* Clear search button */}
            <div className="flex justify-end p-4 border-b border-zinc-800/50">
              <button
                onClick={() => {
                  setSearchHash(null)
                  setInputHash('')
                  setUploadedImage(null)
                }}
                className="px-4 py-2 text-xs font-medium text-zinc-500 hover:text-white bg-zinc-950 hover:bg-zinc-800 rounded-full border border-zinc-800 transition-all"
              >
                Start New Verification
              </button>
            </div>
            
            {isCheckingVerification ? (
              <div className="p-20 text-center">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">Verifying On-Chain...</p>
              </div>
            ) : isVerified ? (
              <>
                {/* Verified Banner */}
                <div className="bg-zinc-950 p-8 text-center border-b border-zinc-800 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-1000"></div>
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-500/10 text-green-500 mb-4 border border-green-500/20">
                     <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Authentic Photo</h2>
                  <p className="text-zinc-400">
                    Verified immutable on {networkName}
                  </p>
                </div>

                {/* Verification Details */}
                <div className="p-8 space-y-6">
                  {/* Metadata Grid */}
                  <div className="bg-black/50 rounded-2xl p-6 border border-zinc-800 space-y-4 font-mono text-sm">
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50">
                      <span className="text-zinc-500">Hash</span>
                      <code className="text-white bg-zinc-900 px-3 py-1 rounded border border-zinc-800">
                        {searchHash.slice(0, 10)}...{searchHash.slice(-8)}
                      </code>
                    </div>

                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50">
                      <span className="text-zinc-500">Verification ID</span>
                      <code className="text-zinc-300">
                        #{generateVerificationId(searchHash)}
                      </code>
                    </div>

                    {attestation && attestation[0] > 0n && (
                      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50">
                        <span className="text-zinc-500">Timestamp</span>
                        <span className="text-emerald-500">
                          {new Date(Number(attestation[0]) * 1000).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {parsedMetadata?.owner && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Owner</span>
                        <a 
                          href={`https://sepolia.arbiscan.io/address/${parsedMetadata.owner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-blue-400 transition-colors underline decoration-zinc-800 underline-offset-4"
                        >
                          {parsedMetadata.owner.slice(0, 8)}...{parsedMetadata.owner.slice(-6)}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* ZK Proof of Ownership Section */}
                  <div className={`rounded-xl p-6 border ${
                    zkProofStatus === 'success' ? 'bg-green-500/5 border-green-500/20' :
                    hasSecret ? 'bg-amber-500/5 border-amber-500/20' :
                    'bg-zinc-950 border-zinc-800'
                  }`}>
                    <div className="flex items-center gap-3 mb-4">
                       <span className={`p-2 rounded-lg ${
                          zkProofStatus === 'success' ? 'bg-green-500/10 text-green-500' : 
                          'bg-zinc-900 text-zinc-400'
                       }`}>🔐</span>
                       <h3 className="font-bold text-white">Ownership Proof</h3>
                    </div>
                    
                    {zkProofStatus === 'success' ? (
                      <div>
                        <p className="text-green-400 font-medium mb-1">Ownership Successfully Proven</p>
                        <p className="text-green-500/60 text-sm">
                          Cryptographic proof validated against on-chain commitment.
                        </p>
                      </div>
                    ) : hasSecret ? (
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-amber-500/80 text-sm">
                          Secret key detected locally. You can prove ownership.
                        </p>
                        <button
                          onClick={proveOwnership}
                          disabled={zkProofStatus === 'proving'}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-sm transition-all"
                        >
                          {zkProofStatus === 'proving' ? 'Verifying...' : 'Prove Ownership'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-sm">
                        Only the original photographer can prove ownership using their private commitment key.
                      </p>
                    )}
                  </div>

                  {/* Blockchain Proof Link */}
                  <div className="text-center pt-4">
                    <a
                      href={generateContractUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm"
                    >
                      <span>View Contract on Arbiscan</span>
                      <span className="text-xs">↗</span>
                    </a>
                  </div>
                </div>
              </>
            ) : (
              /* Not Verified Screen */
              <div className="p-16 text-center bg-red-500/5">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 text-red-500 mb-6 border border-red-500/20">
                   <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Not Verified</h2>
                <p className="text-zinc-400 max-w-md mx-auto">
                  This photo could not be found on the Arbitrum blockchain. It may be unverified or modified.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Grid */}
        {!searchHash && (
          <div className="grid md:grid-cols-3 gap-6 mt-16 text-center">
             <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 transition-all">
                <div className="text-4xl mb-4 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">📸</div>
                <h3 className="text-white font-bold mb-2">1. Capture</h3>
                <p className="text-zinc-500 text-sm">Securely snap photos with device-attested metadata</p>
             </div>
             <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 transition-all">
                <div className="text-4xl mb-4 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">⛓️</div>
                <h3 className="text-white font-bold mb-2">2. Verify</h3>
                <p className="text-zinc-500 text-sm">Hash & ZK proof committed to Arbitrum Stylus contract</p>
             </div>
             <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 transition-all">
                <div className="text-4xl mb-4 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">✅</div>
                <h3 className="text-white font-bold mb-2">3. Prove</h3>
                <p className="text-zinc-500 text-sm">Anyone can verify authenticity without revealing identity</p>
             </div>
          </div>
        )}

        </div>
      </div>
    </div>
  )
}
