import { strict as assert } from 'node:assert'
import { handleRequest } from '../src/worker.mjs'

const env = {
  X402_RESOURCE_ORIGIN: 'https://api.example.com',
  X402_PAY_TO: '0x1111111111111111111111111111111111111111',
  X402_ASSET: '0x2222222222222222222222222222222222222222',
  X402_NETWORK: 'eip155:8453',
  X402_AMOUNT_ATOMIC: '25000',
}

const preflight = await handleRequest(new Request('https://worker.example/paid/report', {
  method: 'OPTIONS',
  headers: {
    Origin: 'https://app.example',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'content-type,x-payment',
  },
}), env)

assert.equal(preflight.status, 204)
assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://app.example')
assert.match(preflight.headers.get('access-control-allow-headers'), /X-PAYMENT/)

const challenge = await handleRequest(new Request('https://worker.example/paid/report?kind=summary', {
  headers: {
    Origin: 'https://app.example',
  },
}), env)

assert.equal(challenge.status, 402)
assert.equal(challenge.headers.get('cache-control'), 'no-store, private')
assert.match(challenge.headers.get('vary'), /X-PAYMENT/)
assert.ok(challenge.headers.get('payment-required'))

const body = await challenge.json()
assert.equal(body.resource.url, 'https://api.example.com/paid/report?kind=summary')
assert.equal(body.accepts[0].extra.resource, body.resource.url)
assert.equal(body.accepts[0].network, 'eip155:8453')
assert.equal(body.accepts[0].maxAmountRequired, '25000')

const paidAttempt = await handleRequest(new Request('https://worker.example/paid/report', {
  headers: {
    Origin: 'https://app.example',
    'X-PAYMENT': 'placeholder',
  },
}), env)

assert.equal(paidAttempt.status, 501)
assert.equal(paidAttempt.headers.get('cache-control'), 'no-store, private')

const health = await handleRequest(new Request('https://worker.example/health'), env)
assert.equal(health.status, 200)
assert.equal(health.headers.get('cache-control'), 'public, max-age=60')
