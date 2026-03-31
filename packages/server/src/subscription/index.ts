// TODO: use effect Schema
export interface Subscription {
  id: string
  deviceID: string
  routeID: string
  directionID: string
  stopID: string
  notifyMinutes: number
  timeRangeStart: string
  timeRangeEnd: string
  timeCreated: Date
  timeUpdated: Date
}