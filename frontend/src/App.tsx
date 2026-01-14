import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config'
import { Header } from './components/Header'
import { PhotoCaptureEnhanced } from './components/PhotoCaptureEnhanced'
import { VerifyPage } from './components/VerifyPage'
import './index.css'

const queryClient = new QueryClient()

function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Header />
      <main className="py-12 relative z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-black to-black pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <PhotoCaptureEnhanced />
        </div>
      </main>
      <footer className="text-center py-12 text-zinc-600 border-t border-zinc-900 bg-black">
        <div className="container mx-auto px-4">
          <p className="text-sm font-medium">
            ArbiPic Verifier • Built on Arbitrum Rust Stylus
          </p>
          <p className="text-xs mt-3 opacity-60">
            Secure • Private • Immutable
          </p>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/verify/:verificationId" element={<VerifyPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
