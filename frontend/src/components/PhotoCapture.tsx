import React, { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { sha256 } from 'js-sha256'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSwitchChain, useChainId } from 'wagmi'
import { VERIFIER_ABI, VERIFIER_ADDRESS } from '../config'
import { Hash } from 'viem'
import { arbitrumSepolia } from 'wagmi/chains'
import { initializeContract } from '../utils/initContract'

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
}

export const PhotoCapture: React.FC = () => {
  const webcamRef = useRef<Webcam>(null)
  const [photo, setPhoto] = useState<PhotoData | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  const isCorrectNetwork = chainId === arbitrumSepolia.id

  // Read attestation data if photo exists
  const { data: attestation } = useReadContract({
    address: VERIFIER_ADDRESS,
    abi: VERIFIER_ABI,
    functionName: 'getAttestation',
    args: photo?.hash ? [BigInt(`0x${photo.hash}`)] : undefined,
    query: {
      enabled: !!photo?.hash
    }
  })

  const capture = useCallback(() => {
    setIsCapturing(true)
    const imageSrc = webcamRef.current?.getScreenshot()
    
    if (imageSrc) {
      // Remove data:image/jpeg;base64, prefix
      const base64Data = imageSrc.split(',')[1]
      const photoHash = sha256(base64Data)
      
      setPhoto({
        imageSrc,
        hash: photoHash
      })
    }
    setIsCapturing(false)
  }, [webcamRef])

  const verifyOnChain = useCallback(async () => {
    if (!photo || !isConnected) return

    // Check if we're on the correct network
    if (!isCorrectNetwork) {
      try {
        await switchChain({ chainId: arbitrumSepolia.id })
      } catch (error) {
        console.error('Failed to switch network:', error)
        return
      }
    }

    writeContract({
      address: VERIFIER_ADDRESS,
      abi: VERIFIER_ABI,
      functionName: 'verifyPhoto',
      args: [BigInt(`0x${photo.hash}`)],
    })
  }, [photo, isConnected, isCorrectNetwork, switchChain, writeContract])

  const handleInitialize = async () => {
    setIsInitializing(true)
    try {
      await initializeContract()
      alert('Contract initialized successfully! You can now verify photos.')
    } catch (error) {
      console.error('Initialization failed:', error)
      alert('Failed to initialize contract. You may not be the owner, or it may already be initialized.')
    } finally {
      setIsInitializing(false)
    }
  }

  const reset = () => {
    setPhoto(null)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <h2 className="text-3xl font-bold text-white text-center">
            📸 ArbiPic Verifier
          </h2>
          <p className="text-white/90 text-center mt-2">
            Capture and verify photos on Arbitrum Sepolia
          </p>
        </div>

        <div className="p-6">
          {!photo ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden shadow-lg">
                <Webcam
                  audio={false}
                  height={720}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width={1280}
                  videoConstraints={videoConstraints}
                  className="w-full"
                />
              </div>
              
              <button
                onClick={capture}
                disabled={isCapturing || !isConnected}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {isConnected ? '📸 Capture Photo' : '🔌 Connect Wallet First'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden shadow-lg">
                <img src={photo.imageSrc} alt="Captured" className="w-full" />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Photo Hash:</span>
                  <code className="text-xs bg-white px-3 py-1 rounded-lg shadow-sm">
                    {photo.hash.slice(0, 16)}...
                  </code>
                </div>
                
                {attestation && attestation > 0n && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Verified At:</span>
                    <span className="text-sm text-green-600 font-semibold">
                      {new Date(Number(attestation) * 1000).toLocaleString()}
                    </span>
                  </div>
                )}

                {hash && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Tx Hash:</span>
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {hash.slice(0, 16)}...
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={verifyOnChain}
                  disabled={isPending || isConfirming || !isConnected || (attestation && attestation > 0n)}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isPending || isConfirming ? '⏳ Verifying...' : 
                   isConfirmed ? '✅ Verified!' :
                   (attestation && attestation > 0n) ? '✅ Already Verified' :
                   !isCorrectNetwork ? '🔄 Switch to Arbitrum Sepolia' :
                   '🔐 Verify On-Chain'}
                </button>

                <button
                  onClick={reset}
                  className="py-3 px-6 bg-gray-500 text-white font-semibold rounded-xl shadow-lg hover:bg-gray-600 transition-all"
                >
                  🔄 New Photo
                </button>
              </div>

              {isConfirmed && (
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 text-center">
                  <p className="text-green-700 font-semibold">
                    ✨ Photo successfully verified on Arbitrum Sepolia!
                  </p>
                </div>
              )}
            </div>
          )}

          {!isConnected && (
            <div className="mt-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 text-center">
              <p className="text-yellow-700 font-medium">
                ⚠️ Please connect your wallet to capture and verify photos
              </p>
            </div>
          )}

          {isConnected && (
            <div className="mt-4 bg-blue-50 border-2 border-blue-400 rounded-xl p-4">
              <p className="text-blue-700 font-medium mb-2 text-center">
                🔧 Contract Admin
              </p>
              <button
                onClick={handleInitialize}
                disabled={isInitializing}
                className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isInitializing ? '⏳ Initializing...' : '🚀 Initialize Contract (One-time)'}
              </button>
              <p className="text-xs text-blue-600 mt-2 text-center">
                Run this once if you're getting high gas fees
              </p>
            </div>
          )}

          {isConnected && !isCorrectNetwork && (
            <div className="mt-4 bg-orange-50 border-2 border-orange-400 rounded-xl p-4 text-center">
              <p className="text-orange-700 font-medium">
                🔄 Wrong Network! Please switch to Arbitrum Sepolia
              </p>
              <p className="text-orange-600 text-sm mt-1">
                Chain ID: {arbitrumSepolia.id} • Click "Verify On-Chain" to switch automatically
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
