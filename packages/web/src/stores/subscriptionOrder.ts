/**
 * Subscription order persistence.
 * Stores the user's preferred order of subscriptions in localStorage.
 */

const SUBSCRIPTION_ORDER_KEY = "bussy-subscription-order"

/**
 * Get the saved subscription order (array of subscription IDs)
 */
export function getSubscriptionOrder(): Array<string> {
  try {
    const stored = localStorage.getItem(SUBSCRIPTION_ORDER_KEY)
    if (stored) {
      return JSON.parse(stored) as Array<string>
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

/**
 * Save the subscription order
 */
export function setSubscriptionOrder(order: Array<string>): void {
  try {
    localStorage.setItem(SUBSCRIPTION_ORDER_KEY, JSON.stringify(order))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Sort subscriptions by the saved order.
 * Subscriptions not in the saved order will be appended at the end.
 */
export function sortByOrder<T extends { id: string }>(subscriptions: Array<T>): Array<T> {
  const order = getSubscriptionOrder()
  if (order.length === 0) return subscriptions

  const orderMap = new Map(order.map((id, index) => [id, index]))

  return [...subscriptions].sort((a, b) => {
    const aIndex = orderMap.get(a.id) ?? Infinity
    const bIndex = orderMap.get(b.id) ?? Infinity
    return aIndex - bIndex
  })
}
