import { NodeSdk } from "@effect/opentelemetry"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc"
import { BatchSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base"
import { Config, Effect } from "effect"

const TracingLayerConfig = Effect.gen(function*() {
  const exporter = yield* Config.string("TRACING_EXPORTER")

  return {
    resource: { serviceName: "bussy", serviceVersion: "0.0.1" },
    spanProcessor: new BatchSpanProcessor(
      exporter === "otlp"
        ? new OTLPTraceExporter()
        : new ConsoleSpanExporter()
    )
  }
})

export const TracingLayer = NodeSdk.layer(TracingLayerConfig)
