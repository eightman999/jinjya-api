# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `jinjya-api`, a distributed omikuji (fortune-telling) API built on Cloudflare Workers. The system allows multiple "shrines" (jinjya) to manage omikuji fortunes independently while providing a unified API for users to draw and submit fortunes.

**Architecture**: The API acts as a buffer/proxy system where:
- Users submit fortunes via `/api/submit` (stored temporarily in KV)
- Users draw random fortunes via `/api/draw` from the buffer
- Shrine owners register their Google Sheets endpoints via `/api/jinjya/register`
- A scheduled cron job publishes buffered data to individual shrine spreadsheets hourly

## Development Commands

```bash
# Start development server
npm run dev
# or
npm start

# Deploy to production
npm run deploy

# Run tests
npm test

# Generate Cloudflare Worker types
npm run cf-typegen
```

## Core Architecture

### Main Entry Point
- `src/index.ts`: Main Worker handler with routing for all API endpoints and scheduled events

### API Endpoints
- `src/api/draw.ts`: GET `/api/draw` - Returns random omikuji from KV buffer
- `src/api/submit.ts`: POST `/api/submit` - Validates and stores omikuji submissions in KV
- `src/api/publish.ts`: POST `/api/publish` - Publishes buffered data to shrine spreadsheets (also runs on cron)
- `src/api/jinjya_register.ts`: POST `/api/jinjya/register` - Registers new shrine with spreadsheet URL
- `src/api/jinjya_deregister.ts`: POST `/api/jinjya/deregister` - Removes shrine registration
- `src/api/jinjya_list.ts`: GET `/api/jinjya/list` - Lists registered shrines
- `src/api/read.ts`: GET `/api/read` - Reads buffered data
- `src/api/schema.ts`: Zod validation schema for omikuji submissions

### Data Storage
- **KV Store** (`JINJYA_STORE`): Temporary buffer for omikuji submissions with keys like `buffer:{jinjyaId}:{timestamp}`
- **D1 Database** (`JINJYA_DB`): Persistent storage for shrine registrations (see `schema.sql`)

### Validation & Security
- `src/constants/ngWords.ts`: Content filtering for inappropriate submissions
- Zod schema validation for all user inputs
- Content length limits (200 chars max per field)

### Types
- `types/worker-configuration.d.ts`: Cloudflare Worker environment types
- `src/types/OmikujiSubmission.ts`: TypeScript interfaces for omikuji data

## Key Configuration Files

- `wrangler.toml`: Cloudflare Workers configuration with KV, D1, cron triggers, and custom domain routing
- `vitest.config.mts`: Test configuration using Cloudflare Workers test pool
- `schema.sql`: D1 database schema for shrine registration

## Data Flow

1. **Submission**: User submits omikuji via `/api/submit` → validates → stores in KV with timestamp key
2. **Drawing**: User requests `/api/draw` → randomly selects from KV buffer → returns fortune
3. **Publishing**: Hourly cron or manual `/api/publish` → groups buffered data by shrine → POSTs to each shrine's Google Sheets webhook → cleans up successful submissions from KV

## Testing

Uses Vitest with Cloudflare Workers pool. Test files in `test/` directory. Run with `npm test`.

## Deployment

Deploys to Cloudflare Workers at domain `bakasekai.net` with API routes under `/api/*`. Uses `npm run deploy` or `wrangler deploy`.