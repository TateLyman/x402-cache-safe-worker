const allowedMethods = 'GET, POST, OPTIONS'
const allowedHeaders = 'Content-Type, X-PAYMENT, PAYMENT-SIGNATURE, Authorization'
const exposedHeaders = 'PAYMENT-REQUIRED, X-PAYMENT-RESPONSE'

export default {
  async fetch(request, env = {}) {
    return handleRequest(request, env)
  },
}

export async function handleRequest(request, env = {}) {
  const url = new URL(request.url)
  const origin = request.headers.get('Origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    })
  }

  if (url.pathname === '/health') {
    return json({ ok: true }, 200, {
      'Cache-Control': 'public, max-age=60',
    })
  }

  if (url.pathname !== '/paid/report') {
    return json({ error: 'not_found' }, 404, noStoreHeaders(origin))
  }

  const payment = request.headers.get('X-PAYMENT') || request.headers.get('Payment-Signature')
  if (!payment) {
    return paymentRequired(request, env, origin)
  }

  return json({
    error: 'payment_verification_not_wired',
    message: 'Verify and settle the payment before serving protected content.',
  }, 501, noStoreHeaders(origin))
}

function paymentRequired(request, env, origin) {
  const resource = new URL(request.url)
  const resourceOrigin = env.X402_RESOURCE_ORIGIN || resource.origin
  resource.protocol = new URL(resourceOrigin).protocol
  resource.host = new URL(resourceOrigin).host

  const requirements = {
    x402Version: 2,
    error: 'Payment required',
    resource: {
      url: resource.toString(),
      description: 'Example protected report',
      mimeType: 'application/json',
    },
    accepts: [{
      scheme: 'exact',
      network: env.X402_NETWORK || 'base-sepolia',
      maxAmountRequired: env.X402_AMOUNT_ATOMIC || '10000',
      asset: env.X402_ASSET || '0x0000000000000000000000000000000000000000',
      payTo: env.X402_PAY_TO || '0x0000000000000000000000000000000000000000',
      maxTimeoutSeconds: 60,
      resource: resource.toString(),
      extra: {
        resource: resource.toString(),
      },
    }],
  }

  return json(requirements, 402, {
    ...noStoreHeaders(origin),
    'PAYMENT-REQUIRED': base64Url(JSON.stringify(requirements)),
  })
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': allowedHeaders,
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Expose-Headers': exposedHeaders,
    'Access-Control-Max-Age': '600',
    Vary: 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
  }
}

function noStoreHeaders(origin) {
  return {
    ...corsHeaders(origin),
    'Cache-Control': 'no-store, private',
    Vary: `${corsHeaders(origin).Vary}, X-PAYMENT, Payment-Signature`,
  }
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  })
}

function base64Url(value) {
  return btoa(value)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}
