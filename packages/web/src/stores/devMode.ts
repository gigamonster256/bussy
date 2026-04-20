/**
 * Dev mode store - controls visibility of debug UI elements
 * Toggle via footer button or set in localStorage
 */

const DEV_MODE_KEY = "bussy:devMode";

export function isDevMode() {
  try {
    return localStorage.getItem(DEV_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setDevMode(enabled: boolean) {
  try {
    if (enabled) {
      localStorage.setItem(DEV_MODE_KEY, "true");
    } else {
      localStorage.removeItem(DEV_MODE_KEY);
    }
  } catch {
    // localStorage not available
  }
}

export function toggleDevMode() {
  const newValue = !isDevMode();
  setDevMode(newValue);
  return newValue;
}
