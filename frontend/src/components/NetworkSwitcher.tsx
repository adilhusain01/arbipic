import React, { useState } from 'react'
import { useAccount, useSwitchChain, useChainId } from 'wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import { orbitL3 } from '../config'

export const NetworkSwitcher: React.FC = () => {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()
  const [isAdding, setIsAdding] = useState(false)

  if (!isConnected) return null

  const isOnSepolia = chainId === arbitrumSepolia.id
  const isOnL3 = chainId === orbitL3.id
  const isOnUnknown = !isOnSepolia && !isOnL3

  const addOrbitL3ToMetaMask = async () => {
    const ethereum = (window as any).ethereum
    if (!ethereum) return false

    try {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x51615', // 333333 in hex
          chainName: 'ArbiPic L3 (Orbit)',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: ['http://127.0.0.1:3347'],
          blockExplorerUrls: null,
        }],
      })
      return true
    } catch (error) {
      console.error('Failed to add Orbit L3:', error)
      return false
    }
  }

  const handleSwitch = async (targetChainId: number) => {
    if (chainId === targetChainId) return

    // For L3, try to add the chain first if needed
    if (targetChainId === orbitL3.id) {
      setIsAdding(true)
      try {
        await addOrbitL3ToMetaMask()
        // After adding, switch to it
        switchChain({ chainId: targetChainId })
      } catch (err) {
        console.error('Switch failed:', err)
      } finally {
        setIsAdding(false)
      }
    } else {
      switchChain({ chainId: targetChainId })
    }
  }

  const isLoading = isPending || isAdding

  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs text-white/70">Network:</span>
      <div className="flex bg-white/10 rounded-lg p-1">
        <button
          onClick={() => handleSwitch(arbitrumSepolia.id)}
          disabled={isLoading}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            isOnSepolia
              ? 'bg-blue-500 text-white shadow-lg'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="flex items-center space-x-1">
            <span>🔵</span>
            <span>Sepolia</span>
          </span>
        </button>
        <button
          onClick={() => handleSwitch(orbitL3.id)}
          disabled={isLoading}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            isOnL3
              ? 'bg-purple-500 text-white shadow-lg'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="flex items-center space-x-1">
            <span>🟣</span>
            <span>Orbit L3</span>
          </span>
        </button>
      </div>
      {isOnUnknown && (
        <span className="text-xs text-yellow-400">⚠️ Wrong network</span>
      )}
      {isLoading && (
        <span className="text-xs text-white/50">Switching...</span>
      )}
    </div>
  )
}
