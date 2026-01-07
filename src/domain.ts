import type { DateTime } from "effect"

export interface Route {
  readonly id: string
  readonly name: string
  readonly shortName: string
  readonly directionList: ReadonlyArray<Direction>
}

export interface Direction {
  readonly id: string
  readonly name: string
  readonly destination: string
  readonly patternList: ReadonlyArray<Pattern>
}

export interface Pattern {
  readonly id: string
  readonly isDisplay: boolean
  readonly geometry: ReadonlyArray<{
    readonly lat: number
    readonly lon: number
    readonly stopCode?: string
  }>
}

export interface Stop {
  readonly code: string
  readonly name: string
  readonly location?: {
    readonly lat: number
    readonly lon: number
  }
}

export interface Arrival {
  readonly routeId: string
  readonly directionId: string
  readonly stopCode: string
  readonly estimatedDepartTimeUtc: DateTime.DateTime
  readonly scheduledDepartTimeUtc: DateTime.DateTime | undefined
  readonly isRealtime: boolean
  readonly isOffRoute: boolean
}

export interface Subscription {
  readonly routeId: string
  readonly directionId: string
  readonly stopId: string
  readonly notifyMinutes: number
  readonly timeRangeStart: string // "HH:mm" 24h
  readonly timeRangeEnd: string // "HH:mm" 24h
  readonly routeName: string
  readonly directionName: string
  readonly stopName: string
}

export interface AuthHeaders {
  readonly cookie: string
  readonly verificationToken: string
}
