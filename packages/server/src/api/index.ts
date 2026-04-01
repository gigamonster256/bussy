import { HttpLayerRouter, HttpApiScalar, HttpApiSwagger } from "@effect/platform"
import { Layer } from "effect"
import { BussyApi } from "./api"
import { HttpHealthLive } from "./health/handler"
import { HttpDeviceLive } from "./device/handler"
import { TokenAuthorizationLive } from "./token-auth"

const DocsRoute = HttpApiScalar.layerHttpLayerRouter({
  api: BussyApi,
  path: "/docs"
})

// const DocsRoute = HttpApiSwagger.layerHttpLayerRouter({
//   api: BussyApi,
//   path: "/docs"
// })

const ResourceHandlersLive = Layer.mergeAll(HttpHealthLive, HttpDeviceLive, HttpSubscriptionLive);

const HttpApiRoutes = HttpLayerRouter.addHttpApi(BussyApi, {
  openapiPath: "/docs/openapi.json"
}).pipe(
  // Provide the api handlers layer
  Layer.provide(HttpHealthLive),
  Layer.provide(HttpDeviceLive)
)

export const BussyApiLive = Layer.mergeAll(HttpApiRoutes, DocsRoute).pipe(
  Layer.provide(HttpLayerRouter.cors()),
  Layer.provide(TokenAuthorizationLive)
)