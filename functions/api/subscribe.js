export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const email = (body.email || '').trim().toLowerCase();
    const consent = Boolean(body.consent);
    const source = (body.source || 'unknown').slice(0, 64);

    if (!email || !isValidEmail(email)) {
      return json({ error: 'Invalid email' }, 400);
    }
    if (!consent) {
      return json({ error: 'Consent required' }, 400);
    }

    const kv = context.env.EMAIL_SUBS;
    if (!kv) {
      return json({ error: 'Storage unavailable: EMAIL_SUBS binding missing' }, 500);
    }

    const record = {
      email,
      consent,
      source,
      ts: Date.now()
    };

    // Store under email key; append a timestamped entry too.
    await kv.put(email, JSON.stringify(record));
    await kv.put(`log:${Date.now()}:${email}`, JSON.stringify(record));

    return json({ ok: true }, 200);
  } catch (err) {
    return json({ error: err.message || 'Unexpected error' }, 500);
  }
}

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
