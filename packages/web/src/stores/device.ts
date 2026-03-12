/**
 * Device ID management.
 * Generates and persists a unique device ID in localStorage.
 */

const DEVICE_ID_KEY = "bussy-device-id"

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Get existing device ID from localStorage, or create a new one
 */
export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) {
      return existing
    }

    const newId = generateUUID()
    localStorage.setItem(DEVICE_ID_KEY, newId)
    return newId
  } catch (_e) {
    // localStorage might be unavailable (private browsing, etc.)
    // Generate a session-only ID
    console.warn("localStorage unavailable, using session-only device ID")
    return generateUUID()
  }
}

/**
 * Get the current device ID (returns null if not set)
 */
export function getDeviceId(): string | null {
  try {
    return localStorage.getItem(DEVICE_ID_KEY)
  } catch {
    return null
  }
}

/**
 * Clear the device ID (for testing/reset purposes)
 */
export function clearDeviceId(): void {
  try {
    localStorage.removeItem(DEVICE_ID_KEY)
  } catch {
    // Ignore
  }
}
