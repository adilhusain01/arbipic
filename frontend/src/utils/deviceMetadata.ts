/**
 * Device Metadata Collection Utilities
 * Collects device fingerprint, resolution, and location for photo verification
 */

import { sha256 } from 'js-sha256'

export interface DeviceMetadata {
  fingerprint: string       // Hashed device info
  resolution: string        // Camera resolution e.g., "1280x720"
  timestamp: number         // Unix timestamp in seconds
  locationHash: string      // Hashed location (lat + lon + salt)
  userAgent: string         // Browser/device info
}

/**
 * Generate a device fingerprint from available browser/device information
 */
export function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    new Date().getTimezoneOffset().toString(),
  ]
  
  // Add canvas fingerprint
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('ArbiPic fingerprint', 2, 2)
      components.push(canvas.toDataURL())
    }
  } catch (e) {
    // Canvas fingerprinting not available
  }
  
  // Add WebGL info if available
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL))
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
      }
    }
  } catch (e) {
    // WebGL not available
  }

  return sha256(components.join('|||'))
}

/**
 * Get current location and hash it for privacy
 */
export async function getLocationHash(salt: string): Promise<string> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      // Return hash of "unknown" if geolocation not available
      resolve(sha256(`unknown|||${salt}`))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        // Round to ~1km precision for privacy (2 decimal places)
        const roundedLat = Math.round(latitude * 100) / 100
        const roundedLon = Math.round(longitude * 100) / 100
        const locationString = `${roundedLat}|||${roundedLon}|||${salt}`
        resolve(sha256(locationString))
      },
      () => {
        // User denied or error - return hash of "denied"
        resolve(sha256(`denied|||${salt}`))
      },
      { timeout: 5000, maximumAge: 60000 }
    )
  })
}

/**
 * Collect all device metadata for photo verification
 */
export async function collectDeviceMetadata(
  resolution: { width: number; height: number },
  locationSalt: string
): Promise<DeviceMetadata> {
  const fingerprint = generateDeviceFingerprint()
  const locationHash = await getLocationHash(locationSalt)
  
  return {
    fingerprint,
    resolution: `${resolution.width}x${resolution.height}`,
    timestamp: Math.floor(Date.now() / 1000),
    locationHash,
    userAgent: navigator.userAgent,
  }
}

/**
 * Convert hex string to BigInt for smart contract
 */
export function hashToBigInt(hash: string): bigint {
  // Ensure hash doesn't have 0x prefix
  const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash
  return BigInt(`0x${cleanHash}`)
}
