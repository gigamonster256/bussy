// TODO: use effect.Schema and match table
export interface Subscription {
  id: string
  deviceId: string
  routeId: string
  directionId: string
  stopId: string
  notifyMinutes: number
  timeRangeStart: string
  timeRangeEnd: string
  createdAt: Date
  updatedAt: Date
}