---
title: Telemetry
---

# Telemetry

Redocly CLI sends a small set of anonymized data to help us understand how the tool is used and improve it.

## What data is collected

Command line input (file names, URLs and organization ids are being anonymized), exit codes, REDOCLY_ENVIRONMENT env variable, and the version of the CLI and NodeJS are collected.

## How to turn off telemetry

To opt-out of telemetry, set the `REDOCLY_TELEMETRY=off` environment variable or put `telemetry: off` in the `redocly.yaml` configuration file.
