---
title: Integrations
order: 4
description: MCP server for AI agents, editor language server, and OpenTelemetry export.
---

## MCP server

Stratify speaks the Model Context Protocol, so your coding agent queries findings directly instead of parsing terminal output.

```sh
stratify mcp
```

This runs a stdio JSON-RPC server exposing one tool, `analyze`. It takes a `path` and an optional `rule` filter, and returns findings as JSON. Register it with any MCP client. For Claude Code:

```json
{
  "mcpServers": {
    "stratify": { "command": "stratify", "args": ["mcp"] }
  }
}
```

Your agent calls `analyze` with `{ "path": ".", "rule": "dead_code" }` and gets structured results back, ready to reason over without screen-scraping a CLI.

## Editor language server

Stratify ships a language server, so findings show up right in your editor.

```sh
stratify lsp
```

The server re-analyzes your workspace on two events: opening a file and saving one. Each run publishes diagnostics for all six analyses, with every diagnostic tagged by its rule name as the diagnostic code, so your editor's problem panel shows `dead_code`, `complexity`, `cycle`, and the rest right alongside the message. Point your editor's LSP client at `stratify lsp`.

The server reads the workspace root from the `initialize` request your editor sends when it starts the connection, so there's no separate config step to point it at your repository.

## OpenTelemetry export

`stratify check` pushes results to any OpenTelemetry backend over OTLP, and does nothing when no endpoint is configured. Configure it with environment variables:

```sh
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.example.com
export OTEL_SERVICE_NAME=my-service   # optional, defaults to the git repo name
stratify check .
```

Or with flags, which override the environment variables:

```sh
stratify check . --otlp-endpoint https://otlp.example.com --project my-service
```

Each run sends a set of gauges plus one summary event:

- `stratify.findings`, broken down by rule, severity, language, and confidence
- `stratify.complexity.max` and `stratify.complexity.mean`
- `stratify.cycles`, `stratify.boundary_violations`, and `stratify.duplication.regions`
- `stratify.files_scanned`, `stratify.functions`, and `stratify.scan.duration_ms`
- a `stratify.run` log event carrying the git commit, branch, and finding totals

The label design is deliberate. `service.name` tags every run, so one dashboard templates across every repo you point Stratify at. Commit and branch ride on the `stratify.run` event instead of on any metric's labels, because attaching a new value per commit to a metric label would grow the metric's cardinality without bound. Keeping them on the event keeps your time series stable while still letting you drill from a metric spike into the exact commit and branch behind it.

**Datadog** ingests OTLP directly:

```sh
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.datadoghq.com
export OTEL_EXPORTER_OTLP_HEADERS=DD-API-KEY=<your-key>
stratify check .
```

Telemetry never fails your scan. An export error prints a warning to stderr, and the exit code still follows `--fail-on`, unaffected by whether the network call landed.
