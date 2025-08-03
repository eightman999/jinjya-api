# jinjya-api Technical Guide

This document outlines the technical specifications for the `jinjya-api` project, a distributed omikuji (fortune-telling) API built on Cloudflare Workers.

## 1. Project Overview

`jinjya-api` is a serverless API that allows multiple "shrines" to manage their own omikuji data streams. It functions as a central buffer and distribution system. Users can submit omikuji fortunes, which are temporarily stored in a KV store. A cron job then periodically forwards these fortunes to the appropriate shrine's designated Google Sheets webhook.

- **Core Functionality**: Omikuji submission, random drawing from a buffer, shrine registration, and scheduled data publishing.
- **Platform**: Cloudflare Workers, KV Store, D1 Database.
- **Primary Language**: TypeScript.

## 2. System Architecture

The system uses a combination of Cloudflare services:
- **Cloudflare Workers**: Executes the core API logic at the edge.
- **KV Store (`JINJYA_STORE`)**: Acts as a temporary buffer for incoming omikuji submissions. This allows for high write throughput and decouples the submission process from the final data storage.
- **D1 Database (`JINJYA_DB`)**: A SQLite-based database that persistently stores shrine registration information, including their unique ID, name, and Google Sheets webhook URL.
- **Google Sheets**: The final destination for each shrine's omikuji data, managed via Google Apps Script webhooks.

## 3. API Endpoints

All endpoints are routed through `src/index.ts`.

| Method | Endpoint                  | Description                                                                                             |
|--------|---------------------------|---------------------------------------------------------------------------------------------------------|
| `POST` | `/api/submit`             | Submits an omikuji fortune. The data is validated and stored in the KV buffer.                          |
| `GET`  | `/api/draw`               | Draws a random omikuji from the KV buffer for a specified shrine (`?jinjya=...`).                       |
| `POST` | `/api/publish`            | Manually triggers the process to publish buffered data to all registered shrines' Google Sheets.        |
| `GET`  | `/api/read`               | Reads the current contents of the KV buffer.                                                            |
| `POST` | `/api/jinjya/register`    | Registers a new shrine, storing its metadata (ID, name, webhook URL) in the D1 database.                |
| `POST` | `/api/jinjya/deregister`  | De-registers a shrine, removing it from the D1 database.                                                |
| `GET`  | `/api/jinjya/list`        | Lists all currently registered shrines from the D1 database.                                            |

## 4. Data Flow

1.  **Shrine Registration**: A shrine owner calls `/api/jinjya/register` with their shrine's details, which are saved to the D1 database. They can optionally provide a JSON string of `tags` to define fixed tag categories for their shrine.
2.  **Omikuji Submission**: A user sends a `POST` request to `/api/submit`. The payload is validated against a Zod schema (`src/api/schema.ts`) and checked for forbidden words (`src/constants/ngWords.ts`). If the target shrine has fixed tags configured, the submission's `tags` are validated against those categories. If valid, the omikuji data is stored in the KV buffer with a key like `buffer:{jinjyaId}:{timestamp}`.
3.  **Omikuji Drawing**: A user sends a `GET` request to `/api/draw`. The system fetches a random omikuji from the KV buffer corresponding to the requested shrine.
4.  **Data Publishing**:
    - A cron job (`0 * * * *`) runs hourly, or an operator calls `/api/publish` manually.
    - The worker fetches all recent records from the KV buffer.
    - It groups the records by `jinjyaId`.
    - For each shrine, it retrieves the `spreadsheet_url` from the D1 database.
    - It sends the grouped data to the corresponding Google Sheets webhook.
    - Upon successful delivery, the records are deleted from the KV buffer.

## 5. Data Structures

### Omikuji Submission Payload

The core data object for an omikuji, defined in `src/api/schema.ts` as `OmikujiSchema`.

```typescript
{
  jinjya: string,        // Shrine ID (1-64 characters)
  fortune: string,       // Fortune result (e.g., "大吉", "中吉", "凶")
  message: string,       // Fortune message/description
  tags: Record<string, string>,    // Fortune categories (e.g., {"恋愛": "良い出会いがある", "金運": "投資に注意"})
  extra: Record<string, string>    // Additional information (e.g., {"ラッキーカラー": "赤", "動物": "龍"})
}
```

**Field Details:**
- `jinjya`: Required. The ID of the shrine this omikuji belongs to (must match a registered shrine ID).
- `fortune`: Required. The main fortune level or result.
- `message`: Required. The detailed message or interpretation.
- `tags`: Optional. Key-value pairs representing fortune categories and their descriptions. **If the shrine has fixed tag categories configured, only those categories are accepted.** Common categories include 恋愛 (love), 金運 (money), 仕事 (work), 健康 (health), etc.
- `extra`: Optional. Additional fortune elements like lucky colors, animals, numbers, etc.

### Shrine Registration Payload

Data structure for registering a new shrine via `/api/jinjya/register`.

```typescript
{
  id: string,             // Unique shrine identifier
  name: string,           // Shrine display name
  spreadsheet_url: string, // Google Sheets webhook URL for data publishing
  owner?: string,         // Optional owner identifier
  tags?: Record<string, string>  // Optional fixed tag categories for this shrine
}
```

**Tags Field Details:**
- `tags`: Optional. Defines the fixed tag categories that users can submit for this shrine.
- Example: `{"恋愛": "Love and relationships", "金運": "Money and wealth", "健康": "Health and wellness"}`
- When provided, users can only submit omikuji with tags matching these categories.
- If not provided, users can submit any tag categories.

### Fixed Tag Categories System

**How it works:**
1. **Shrine Registration**: When registering a shrine, the owner can provide a `tags` object defining allowed categories.
2. **Tag Validation**: During omikuji submission, if the target shrine has fixed tags configured, the system validates that all user-provided tag keys exist in the shrine's allowed categories.
3. **Error Handling**: If a user tries to submit a tag category not allowed by the shrine, they receive a 400 error with details about the allowed categories.

**Example Usage:**

Shrine registration with fixed tags:
```json
{
  "id": "love_shrine",
  "name": "恋愛神社", 
  "spreadsheet_url": "https://script.google.com/...",
  "owner": "shrine_master",
  "tags": {
    "恋愛": "恋愛運について",
    "結婚": "結婚運について",
    "人間関係": "人間関係について"
  }
}
```

Valid omikuji submission to this shrine:
```json
{
  "jinjya": "love_shrine",
  "fortune": "大吉",
  "message": "素晴らしい日です",
  "tags": {
    "恋愛": "素敵な出会いがあります",
    "結婚": "良い知らせが届くでしょう"
  }
}
```

## 6. Validation & Security

### Content Validation
- **Zod Schema**: All submissions are validated against the `OmikujiSchema` using Zod.
- **Character Limits**: All string fields have a maximum length of 200 characters.
- **NG Words**: Content is filtered against a list of inappropriate words defined in `src/constants/ngWords.ts`.
- **Fixed Tag Categories**: If a shrine has fixed tag categories configured, user submissions are validated against those categories.

### Buffer Key Format
KV store keys follow the pattern: `buffer:{jinjyaId}:{timestamp}`
- Example: `buffer:shrine001:1691234567890`

## 7. Development Commands

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

## 8. Configuration Files

- **`wrangler.toml`**: Cloudflare Workers configuration including KV bindings, D1 database, cron triggers, and custom domain routing.
- **`schema.sql`**: D1 database schema for shrine registrations.
- **`vitest.config.mts`**: Test configuration using Cloudflare Workers testing environment.
- **`types/worker-configuration.d.ts`**: TypeScript definitions for Cloudflare Worker environment variables.

## 9. Deployment

The API deploys to Cloudflare Workers and is accessible at:
- **Primary Domain**: `bakasekai.net/api/*`
- **Subdomain**: `jinjya-api.bakasekai.net/*`

Deploy using:
```bash
npm run deploy
# or
wrangler deploy
```

## 10. Testing

The project uses Vitest with Cloudflare Workers test pool. Test files are located in the `test/` directory.

```bash
npm test
```

## 11. Scheduled Jobs

A cron job runs every hour (`0 * * * *`) to automatically publish buffered omikuji data to registered shrines' Google Sheets. This can also be triggered manually via the `/api/publish` endpoint.