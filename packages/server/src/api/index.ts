import { HttpLayerRouter, HttpApiScalar, HttpApiSwagger } from "@effect/platform"
import { Layer } from "effect"
import { BussyApi } from "./api"
import { HealthLive } from "./health"
import { DeviceLive } from "./device"

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
  Layer.provide(HealthLive),
  Layer.provide(DeviceLive)
)

export const BussyApiLive = Layer.mergeAll(HttpApiRoutes, DocsRoute).pipe(
  Layer.provide(HttpLayerRouter.cors())
)