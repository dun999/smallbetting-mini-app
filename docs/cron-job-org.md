# cron-job.org Setup For Smallbetting

This guide describes the recommended production cron configuration for Smallbetting when the app is hosted on Vercel Hobby.

## Why External Cron Is Needed

Smallbetting uses a rolling Bitcoin market with a `10 minute` window. The app needs frequent automation to:

- create the next BTC market before or as the slot changes
- settle markets soon after they become resolvable
- keep football fixtures synchronized with the latest official schedule

Vercel Hobby cron is not frequent enough for this workload, so the recommended primary scheduler is `cron-job.org`.

Official references:

- [cron-job.org](https://cron-job.org/)
- [cron-job.org FAQ](https://cron-job.org/faq/)
- [cron-job.org REST API docs](https://docs.cron-job.org/rest-api.html)

## Required Environment Variables

Your deployed app should already have these values configured in Vercel:

```env
NEXT_PUBLIC_APP_URL=https://smallbetting-mini-app.vercel.app
NEXT_PUBLIC_SMALLBETTING_CONTRACT=0x8e05a4B45f421C5e99669501FFc7488e96BD66c4
BASE_RPC_URL=https://base-rpc.publicnode.com
TREASURY_ADDRESS=0x6D183A6c0c37A13B3Db5C159795cC10F23b2E75D
ADMIN_SECRET=your-strong-random-secret
OWNER_PRIVATE_KEY=private-key-for-the-marketCreator-and-resolver-wallet
```

## Job 1: Market Sync

Create a cron-job.org job with these settings:

- Title: `Smallbetting Sync Markets`
- URL: `https://smallbetting-mini-app.vercel.app/api/admin/sync-markets?secret=YOUR_ADMIN_SECRET`
- Method: `GET`
- Schedule: `every 1 minute`
- Timeout: keep the default unless you observe long response times

Purpose:

- creates missing BTC rolling markets
- creates the next football market when a fresh official fixture becomes available

## Job 2: Market Reconcile

Create a second cron-job.org job with these settings:

- Title: `Smallbetting Reconcile Markets`
- URL: `https://smallbetting-mini-app.vercel.app/api/admin/reconcile?secret=YOUR_ADMIN_SECRET`
- Method: `GET`
- Schedule: `every 1 minute`
- Timeout: keep the default unless you observe long response times

Purpose:

- settles finished markets
- voids markets with too few unique bettors
- voids markets with one-sided liquidity at settlement time

## Expected Responses

A healthy sync response should return JSON describing created or skipped markets.

A healthy reconcile response should return JSON describing resolved, voided, skipped, or failed markets.

If you receive `401 Unauthorized`, verify:

- the `secret` query parameter matches `ADMIN_SECRET`
- the deployed environment variables were saved in Vercel
- the app was redeployed after updating the environment variables

If you receive `500` errors, verify:

- `OWNER_PRIVATE_KEY` belongs to the wallet that currently has `marketCreator` and `resolver` permissions
- the wallet has enough ETH on Base to pay gas
- `BASE_RPC_URL` is healthy and not rate-limited

## Recommended Operating Model

Use cron-job.org as the primary scheduler and keep `vercel.json` cron as a low-frequency backup only.

That gives you:

- real-time compatible market maintenance
- compatibility with Vercel Hobby pricing
- a second safety layer if the external cron is temporarily unavailable

## Post-Setup Verification

After both jobs are created, verify the following:

1. A new BTC market appears as time rolls into the next `10 minute` slot.
2. Football cards show exact onchain markets for the next official fixture.
3. Finished BTC markets resolve shortly after their `resolveTime`.
4. Void markets become claimable as refunds.
5. `/api/markets` keeps returning fresh market data.
