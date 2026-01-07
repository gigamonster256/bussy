import { Effect, Layer } from "effect"
import { AggieSpiritAuth } from "../services/AggieSpiritAuth.js"

const generateRandomToken = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 288; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result + "MQ=="
}

const generateRandomCookie = () => {
  return `ASP.NET_SessionId=${generateRandomToken().substring(0, 24)}; Path=/; HttpOnly`
}

export const AggieSpiritAuthMock = Layer.effect(
  AggieSpiritAuth,
  Effect.succeed({
    headers: Effect.fn("AggieSpiritAuthMock.getAuthenticationHeaders")(() =>
      Effect.succeed({
        Cookie: generateRandomCookie(),
        RequestVerificationToken: generateRandomToken(),
        "X-Requested-With": "XMLHttpRequest"
      })
    )
  })
)
