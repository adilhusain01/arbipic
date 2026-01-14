import React from 'react'
import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi'
import { NetworkSwitcher } from './NetworkSwitcher'
import { orbitL3 } from '../config'

const Icons = {
  Wallet: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>,
  Camera: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>,
}

export const Header: React.FC = () => {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()

  const networkName = chainId === orbitL3.id ? 'Orbit L3' : 'Arbitrum Sepolia'

  return (
    <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="p-2 bg-white/5 rounded-xl border border-white/10 group-hover:bg-white/10 transition-colors">
              <Icons.Camera />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">ArbiPic</h1>
              <p className="text-xs text-zinc-400 font-medium tracking-wide">Protocol</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isConnected && <NetworkSwitcher />}
            
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <div className="hidden md:block bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                     <span className={`w-2 h-2 rounded-full ${chainId === orbitL3.id ? 'bg-purple-500' : 'bg-green-500'}`}></span>
                     <p className="text-xs font-mono text-zinc-400">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                     </p>
                  </div>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="px-4 py-2 bg-white/5 hover:bg-red-500/10 text-zinc-300 hover:text-red-400 border border-white/10 hover:border-red-500/20 font-medium rounded-lg transition-all text-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="px-6 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-all shadow-lg shadow-white/10 flex items-center gap-2"
              >
                <Icons.Wallet />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
