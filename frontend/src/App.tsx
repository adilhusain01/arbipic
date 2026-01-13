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
    <div className="min-h-screen">
      <Header />
      <main className="py-8">
        <div className="container mx-auto px-4 space-y-8">
          <PhotoCaptureEnhanced />
        </div>
      </main>
      <footer className="text-center py-6 text-white/80">
        <p className="text-sm">
          Built with Stylus • Arbitrum Sepolia • Powered by Rust
        </p>
        <p className="text-xs mt-2">
          🏆 Arbitrum Hackathon Project
        </p>
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
