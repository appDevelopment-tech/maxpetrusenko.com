# API Integration Patterns That Actually Scale

**Published:** 2026-01
**Tags:** #API #Integration #Automation #Development
**Reading time:** 5 min

---

Most API integrations are technical debt waiting to happen. Here are patterns I&apos;ve used to build integrations that survive the test of time.

## The Integration Trap

You need Tool A to talk to Tool B. Quick hack, some API calls, done.

Six months later:
- API changed, everything broke
- No one knows how it works
- Error handling is a try/catch with `console.error`
- Scaling requires rewriting

Sound familiar?

## Pattern 1: Abstraction Layer

Never call a third-party API directly from your business logic.

```typescript
// Bad
class UserService {
  async create(data) {
    await axios.post('https://api.stripe.com/...', data)
  }
}

// Good
class UserService {
  async create(data) {
    await this.paymentProvider.charge(data)
  }
}

// Swap Stripe for anything else without touching business logic
```

Your core code shouldn&apos;t know Stripe exists.

## Pattern 2: Idempotency by Default

Network failures happen. Retry logic is essential. But retries cause duplicate operations.

Every write operation should be idempotent:

```typescript
// Include idempotency key
async charge(amount, idempotencyKey) {
  return await api.post('/charges', {
    amount,
    idempotency_key: idempotencyKey
  })
}

// Safe to retry—duplicate keys return same result
```

Most modern APIs support this. Use it.

## Pattern 3: Webhook Verification

Never trust incoming webhooks. Always verify:

```typescript
// Verify signature
const signature = headers['webhook-signature']
const expected = hmac(secret, body)

if (!timingSafeEqual(signature, expected)) {
  throw new Error('Invalid signature')
}

// Now process the webhook
```

And implement idempotency here too—you might receive the same webhook twice.

## Pattern 4: Graceful Degradation

What happens when the API is down?

```typescript
// Bad—API down means your app is down
async getUser(id) {
  return await externalApi.getUser(id)
}

// Better—fallback path
async getUser(id) {
  try {
    return await externalApi.getUser(id)
  } catch (error) {
    return await cache.get(id)
  }
}

// Best—background sync
async getUser(id) {
  const cached = await cache.get(id)
  if (cached) {
    // Refresh in background
    refreshInBackground(id)
    return cached
  }
  return await externalApi.getUser(id)
}
```

Your app should feel fast even when APIs are slow.

## Pattern 5: Rate Limit Awareness

Three layers of protection:

1. **Pre-emptive:** Track your usage, stay under limits
2. **Reactive:** Handle 429 responses with exponential backoff
3. **Fallback:** Queue requests for later processing

```typescript
async withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000
        await sleep(delay)
        continue
      }
      throw error
    }
  }
}
```

## Pattern 6: Observability Is Not Optional

You can&apos;t fix what you can&apos;t see:

- Log all API calls (request, response, timing)
- Track error rates by endpoint
- Alert on unusual patterns
- Dashboard for quick diagnosis

When something breaks at 3 AM, you&apos;ll thank yourself.

## The Integration Checklist

Before shipping any integration:

- [ ] Abstraction layer in place
- [ ] Idempotent write operations
- [ ] Webhook signature verification
- [ ] Rate limit handling
- [ ] Error recovery paths
- [ ] Logging and metrics
- [ ] Monitoring configured
- [ ] Documentation for the next developer

## Real Talk

Most integrations fail not because of technical complexity but because of:
- No clear ownership
- Poor error handling
- Lack of monitoring
- Tightly coupled code

The patterns here solve the technical side. The rest is discipline.

---

*Need help building reliable integrations? [Let&apos;s talk](https://maxpetrusenko.com/tech/ai-automation).*
