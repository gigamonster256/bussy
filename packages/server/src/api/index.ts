import { HttpLayerRouter, HttpApiScalar } from "@effect/platform";
import { Layer } from "effect";
import { BussyApi } from "@bussy/api";
import { HttpHealthLive } from "./health";
import { HttpDeviceLive } from "./device";
import { HttpSubscriptionLive } from "./subscription";
import { HttpMetaLive } from "./meta";
import { HttpArrivalLive } from "./arrival";
import { TokenAuthorizationLive } from "./token-auth";

const DocsRoute = HttpApiScalar.layerHttpLayerRouter({
  api: BussyApi,
  path: "/docs",
});

// const DocsRoute = HttpApiSwagger.layerHttpLayerRouter({
//   api: BussyApi,
//   path: "/docs"
// })

const ResourceHandlersLive = Layer.mergeAll(
  HttpHealthLive,
  HttpDeviceLive,
  HttpSubscriptionLive,
  HttpMetaLive,
  HttpArrivalLive,
);

const HttpApiRoutes = HttpLayerRouter.addHttpApi(BussyApi, {
  openapiPath: "/docs/openapi.json",
}).pipe(
  // Provide the api handlers layer
  Layer.provide(ResourceHandlersLive),
);

export const BussyApiLive = Layer.mergeAll(HttpApiRoutes, DocsRoute).pipe(
  Layer.provide(HttpLayerRouter.cors()),
  Layer.provide(TokenAuthorizationLive),
);
