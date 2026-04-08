# n8n Workflow Setup Guide

## Prerequisites
1. Create an account at https://n8n.io (Cloud) or self-host on Railway/Render
2. Have all API keys ready (Polygon.io, Anthropic, your app's webhook URL)

## Required n8n Credentials

Create these credentials in n8n → Credentials:

| Name | Type | Values |
|------|------|--------|
| Polygon API | HTTP Header Auth | Header: `Authorization`, Value: `Bearer YOUR_POLYGON_KEY` |
| App Webhook | HTTP Header Auth | Header: `x-webhook-secret`, Value: `YOUR_N8N_WEBHOOK_SECRET` |
| Neon PostgreSQL | PostgreSQL | Your `DATABASE_URL` values |
| SMTP Email | SMTP | Your email provider settings |

## Importing Workflows

1. Open your n8n instance
2. Go to **Workflows** → **Import from File**
3. Import each `.json` file in this directory
4. Update credentials in each workflow node
5. Update the webhook URL to your deployed app URL
6. Activate each workflow

## Workflow Overview

### 1. `news-ingestion.json` — Every 15 minutes (market hours)
```
Schedule Trigger (9:30–16:30 ET weekdays)
  → PostgreSQL: SELECT DISTINCT ticker FROM watchlists
  → Split in Batches (5 tickers)
  → HTTP Request: POST /api/rag/ingest
  → Set: log results
```

### 2. `daily-briefing.json` — 9:15 AM ET weekdays
```
Schedule Trigger
  → HTTP: GET Polygon.io snapshot (SPY, QQQ, DIA, futures)
  → HTTP: GET Polygon.io News (top market news)
  → HTTP POST: Claude API (generate briefing)
  → Email: Send to all users
  → HTTP POST: /api/webhooks/n8n { type: 'briefing' }
```

### 3. `eod-analysis.json` — 4:30 PM ET weekdays
```
Schedule Trigger
  → PostgreSQL: Get all watchlist tickers
  → HTTP: GET /api/analysis/signals for each
  → Filter: Find new crossovers vs yesterday
  → Email: Send daily digest
```

### 4. `price-alerts.json` — Every 1 minute (market hours)
```
Schedule Trigger
  → PostgreSQL: Get active alerts
  → HTTP: GET /api/stocks/quote for each ticker
  → IF: Check alert conditions
  → Email + HTTP POST: /api/webhooks/n8n { type: 'price_alert' }
  → PostgreSQL: Mark alert as triggered
```

### 5. `earnings-alerts.json` — Monday 8 AM ET
```
Schedule Trigger
  → HTTP: GET Finnhub earnings calendar (next 7 days)
  → PostgreSQL: Filter by user watchlists
  → HTTP: GET /api/analysis/signals (pre-earnings analysis)
  → Email: Send earnings preview report
```

## Setting Environment Variables in n8n

For each HTTP Request node that calls your app, add header:
```
x-webhook-secret: {{ $env.N8N_WEBHOOK_SECRET }}
```

Set `N8N_WEBHOOK_SECRET` in n8n Settings → Environment Variables to match your app's `.env.local`.

## Cron Schedules (ET timezone)

```
Market hours check:  0 9-16 * * 1-5
Daily briefing:      15 9 * * 1-5
EOD analysis:        30 16 * * 1-5
Price alerts:        */1 9-16 * * 1-5
Weekly earnings:     0 8 * * 1
News ingestion:      */15 9-16 * * 1-5
```
