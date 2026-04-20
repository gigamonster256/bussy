import { HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";

/**
 * Creates a standardized error response
 */
export const errorResponse = (error: string, message: string, statusCode: number) =>
  HttpServerResponse.json({ error, message, statusCode }, { status: statusCode });

/**
 * Wraps a route handler with defect handling (uncaught errors)
 */
export const withDefectHandler =
  (routeName: string) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(
      Effect.catchAllDefect((defect) =>
        Effect.gen(function* () {
          yield* Effect.logError(`${routeName} defect: ${defect}`);
          return yield* errorResponse("INTERNAL_ERROR", String(defect), 500);
        }),
      ),
    );
