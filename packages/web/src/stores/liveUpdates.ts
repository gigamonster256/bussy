/**
 * Live updates preference store - remembers if user had live timetable enabled
 */

const LIVE_UPDATES_KEY = "bussy:liveUpdatesEnabled"

export function getLiveUpdatesPreference(): boolean {
  try {
    // Default to true if not set
    const value = localStorage.getItem(LIVE_UPDATES_KEY)
    return value === null ? true : value === "true"
  } catch {
    return true
  }
}

export function setLiveUpdatesPreference(enabled: boolean): void {
  try {
    localStorage.setItem(LIVE_UPDATES_KEY, enabled ? "true" : "false")
  } catch {
    // localStorage not available
  }
}
