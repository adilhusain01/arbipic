/**
 * Verification Badge & Twitter Sharing Utilities
 * Generate verification links, badges, and Twitter-compatible content
 */

import { APP_URL, VERIFIER_ADDRESS, PINATA_GATEWAY } from '../config'

export interface VerificationData {
  photoHash: string
  txHash: string
  timestamp: number
  owner: string
  ipfsCid?: string
}

/**
 * Generate a short verification ID from photo hash
 * Uses first 12 chars of hash for display purposes
 */
export function generateVerificationId(photoHash: string): string {
  const cleanHash = photoHash.startsWith('0x') ? photoHash.slice(2) : photoHash
  return cleanHash.slice(0, 12).toLowerCase()
}

/**
 * Generate full verification URL for sharing
 * Uses full hash so verification works across devices without local storage
 */
export function generateVerificationUrl(photoHash: string): string {
  const cleanHash = photoHash.startsWith('0x') ? photoHash.slice(2) : photoHash
  return `${APP_URL}/verify/${cleanHash}`
}

/**
 * Generate Arbiscan transaction URL
 */
export function generateTxUrl(txHash: string): string {
  return `https://sepolia.arbiscan.io/tx/${txHash}`
}

/**
 * Generate contract URL on Arbiscan
 */
export function generateContractUrl(): string {
  return `https://sepolia.arbiscan.io/address/${VERIFIER_ADDRESS}`
}

/**
 * Generate Twitter share text with verification link
 */
export function generateTwitterShareText(data: VerificationData): string {
  const verificationUrl = generateVerificationUrl(data.photoHash)
  const date = new Date(data.timestamp * 1000).toLocaleDateString()
  
  return `
🔗 Arbipic: ${verificationUrl}`
}

/**
 * Generate Twitter share URL (opens Twitter with pre-filled text)
 */
export function generateTwitterShareUrl(data: VerificationData, imageUrl?: string): string {
  const text = encodeURIComponent(generateTwitterShareText(data))
  
  return `https://twitter.com/intent/tweet?text=${text}`
}

/**
 * Generate verification badge as SVG
 */
export function generateVerificationBadgeSVG(verified: boolean, timestamp?: number): string {
  const date = timestamp ? new Date(timestamp * 1000).toLocaleDateString() : ''
  
  if (verified) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="200" height="50" rx="8" fill="url(#grad)"/>
        <text x="40" y="22" fill="white" font-family="Arial" font-size="12" font-weight="bold">✓ ArbiPic Verified</text>
        <text x="40" y="38" fill="rgba(255,255,255,0.8)" font-family="Arial" font-size="10">${date}</text>
        <circle cx="18" cy="25" r="12" fill="white"/>
        <text x="12" y="30" font-size="14">📸</text>
      </svg>
    `.trim()
  }
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50">
      <rect width="200" height="50" rx="8" fill="#EF4444"/>
      <text x="40" y="30" fill="white" font-family="Arial" font-size="12" font-weight="bold">✗ Not Verified</text>
    </svg>
  `.trim()
}

/**
 * Generate QR code data URL for verification
 * Uses a simple QR code API
 */
export function generateVerificationQRCodeUrl(photoHash: string, size: number = 150): string {
  const verificationUrl = generateVerificationUrl(photoHash)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(verificationUrl)}`
}

/**
 * Add verification watermark to image
 * Returns a new canvas with the watermark applied
 */
export async function addVerificationWatermark(
  imageDataUrl: string,
  photoHash: string,
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw original image
      ctx.drawImage(img, 0, 0)
      
      // Add semi-transparent overlay with verification info
      const padding = 10
      const boxHeight = 30
      const boxWidth = 180
      
      let x = padding
      let y = canvas.height - boxHeight - padding
      
      if (position.includes('right')) {
        x = canvas.width - boxWidth - padding
      }
      if (position.includes('top')) {
        y = padding
      }
      
      // Draw background box
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.roundRect(x, y, boxWidth, boxHeight, 5)
      ctx.fill()
      
      // Draw text
      ctx.fillStyle = 'white'
      ctx.font = 'bold 12px Arial'
      ctx.fillText('✓ ArbiPic Verified', x + 10, y + 20)
      
      // Draw short hash
      const shortHash = generateVerificationId(photoHash)
      ctx.font = '10px monospace'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillText(`#${shortHash}`, x + 120, y + 20)
      
      resolve(canvas.toDataURL('image/jpeg', 0.95))
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageDataUrl
  })
}

/**
 * Store verification data locally for quick access
 */
export function storeVerificationLocally(data: VerificationData): void {
  const key = `arbipic_verification_${generateVerificationId(data.photoHash)}`
  localStorage.setItem(key, JSON.stringify(data))
  
  // Also maintain a list of all verified photos
  const listKey = 'arbipic_verified_photos'
  const existingList = JSON.parse(localStorage.getItem(listKey) || '[]')
  if (!existingList.includes(data.photoHash)) {
    existingList.push(data.photoHash)
    localStorage.setItem(listKey, JSON.stringify(existingList))
  }
}

/**
 * Retrieve verification data from local storage
 */
export function getLocalVerification(verificationId: string): VerificationData | null {
  const key = `arbipic_verification_${verificationId}`
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : null
}

/**
 * Get all locally stored verified photos
 */
export function getAllLocalVerifications(): string[] {
  const listKey = 'arbipic_verified_photos'
  return JSON.parse(localStorage.getItem(listKey) || '[]')
}

/**
 * Copy verification link to clipboard
 */
export async function copyVerificationLink(photoHash: string): Promise<boolean> {
  const url = generateVerificationUrl(photoHash)
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch (e) {
    console.error('Failed to copy:', e)
    return false
  }
}

/**
 * Generate IPFS URL for image
 */
export function getIpfsUrl(cid: string): string {
  let url = PINATA_GATEWAY
  
  // Ensure protocol
  if (!url.startsWith('http')) {
    url = `https://${url}`
  }
  
  // Remove trailing slashes and normalize
  url = url.replace(/\/+$/, '')
  
  // Add /ipfs/ path if not present and using a gateway domain
  if (!url.includes('/ipfs/')) {
    url = `${url}/ipfs`
  }
  
  return `${url}/${cid}`
}
