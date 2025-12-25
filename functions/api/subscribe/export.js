// Protected export of captured emails as CSV or JSON.
export async function onRequestGet(context) {
  const kv = context.env.EMAIL_SUBS;
  const auth = context.request.headers.get('Authorization') || '';
  const url = new URL(context.request.url);
  const format = url.searchParams.get('format') || 'csv';
  const expected = context.env.EXPORT_TOKEN;

  if (!kv) return json({ error: 'Storage unavailable' }, 500);
  if (!expected || auth !== `Bearer ${expected}`) return json({ error: 'Unauthorized' }, 401);

  const list = await dumpKV(kv, 'log:');
  if (format === 'json') {
    return new Response(JSON.stringify(list), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const csv = ['email,consent,source,ts'].concat(
    list.map((r) => {
      const email = safe(r.email);
      const consent = r.consent ? 'true' : 'false';
      const source = safe(r.source);
      const ts = r.ts || '';
      return `${email},${consent},${source},${ts}`;
    })
  ).join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="emails.csv"'
    }
  });
}

async function dumpKV(kv, prefix) {
  const results = [];
  let cursor;
  do {
    const { keys, list_complete, cursor: next } = await kv.list({ prefix, cursor });
    for (const k of keys) {
      const val = await kv.get(k.name, 'json');
      if (val) results.push(val);
    }
    cursor = next;
    if (list_complete) break;
  } while (cursor);
  return results;
}

function safe(str = '') {
  return String(str).replace(/"/g, '""');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
