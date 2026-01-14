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
    <div className="flex items-center space-x-3 bg-zinc-900/50 p-1 rounded-lg border border-white/5">
      <button
        onClick={() => handleSwitch(arbitrumSepolia.id)}
        disabled={isLoading}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
          isOnSepolia
            ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
            : 'text-zinc-500 hover:text-zinc-300'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${isOnSepolia ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-zinc-600'}`}></div>
        <span>Sepolia</span>
      </button>
      
      <button
        onClick={() => handleSwitch(orbitL3.id)}
        disabled={isLoading}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
          isOnL3
            ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
            : 'text-zinc-500 hover:text-zinc-300'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${isOnL3 ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-zinc-600'}`}></div>
        <span>Orbit L3</span>
      </button>
      
      {isOnUnknown && (
        <span className="px-2 text-xs text-yellow-500 font-mono">Wrong Network</span>
      )}
    </div>
  )
}
