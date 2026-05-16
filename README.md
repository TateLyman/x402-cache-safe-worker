# x402 Cache-Safe Worker

Cloudflare Worker starter for x402-style payment gates that keeps the web boundary boring:

- `OPTIONS` preflight allows the payment headers clients need.
- `402` challenge responses use `Cache-Control: no-store, private`.
- Payment-gated responses vary on payment headers.
- The challenge repeats the canonical resource URL at the top level and inside `accepts[0].extra.resource`.
- The sample refuses to serve protected content until real verification and settlement are wired.

This repo is intentionally a starter, not a drop-in facilitator. It never includes real keys, never signs payments, and never settles funds.

Public implementation guide:
https://tateprograms.com/cloudflare-x402-worker.html

## Why This Exists

x402 and AgentCore-style payment agents make paid API calls look like normal HTTP. That means normal web behavior matters: CORS, cache policy, `Vary` headers, resource binding, and idempotency become launch controls.

Use this as a minimal reference when wiring a Cloudflare Worker in front of an x402-protected route.

## Run Checks

```bash
npm test
```

The smoke test verifies:

- browser preflight allows `X-PAYMENT`;
- no-payment requests return `402`;
- the challenge response is not publicly cacheable;
- resource URLs are canonical and repeated for reconciliation;
- requests with a placeholder payment are not granted by the starter.

## Local Shape

```text
src/worker.mjs   Worker fetch handler
test/smoke.mjs   no-dependency smoke tests with Request/Response
wrangler.jsonc   Cloudflare Worker config template
```

## Deploy

Install Wrangler if you do not already have it:

```bash
npm create cloudflare@latest
```

Then copy the Worker handler or adapt `wrangler.jsonc` for your account.

Before production, replace the placeholder `X402_*` values and wire actual facilitator verification and settlement. Do not serve protected content from this starter until verification succeeds.

## Production Checklist

- Replace placeholder payee, asset, amount, and network.
- Pin the canonical public resource origin.
- Verify and settle the payment before serving protected content.
- Add a durable idempotency claim keyed by payment id and resource id.
- Keep protected responses `Cache-Control: no-store, private`.
- Keep `Vary` aligned with payment headers and origin behavior.
- Log request id, resource id, payment id, verification result, settlement result, and grant result.
- Reconcile paid-but-not-served and served-but-not-settled states.

## Related

- Cloudflare x402 Worker guide: https://tateprograms.com/cloudflare-x402-worker.html
- x402 Surface Check: https://www.npmjs.com/package/x402-surface-check
- x402 Attack Map: https://tateprograms.com/x402-attack-map-2026.html
- x402 CORS Fix: https://tateprograms.com/x402-cors-fix.html
