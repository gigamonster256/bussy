
// TODO: use effect.Schema and match table
export interface Device {
  id: string
  pushEndpoint: string | null
  pushP256dh: string | null
  pushAuth: string | null
  createdAt: Date
  lastSeenAt: Date
}