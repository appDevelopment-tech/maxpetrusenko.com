---
name: common-solutions
description: Internal documentation; not intended as an agent trigger.
---

# Common Issues & Solutions

**Purpose:** Quick reference for main agent during coding to avoid known pitfalls

**Last Updated:** 2024-10-03

---

## 🐛 React Issues

### 1. Async State Race Conditions
**Problem:** `Cannot read property of undefined` or state updates on unmounted component

**Cause:** Component unmounts before async operation completes

**Solution:**
```javascript
useEffect(() => {
  let isMounted = true;

  fetchData().then(data => {
    if (isMounted) {
      setState(data);
    }
  });

  return () => {
    isMounted = false;
  };
}, []);
```

**Alternative (with AbortController):**
```javascript
useEffect(() => {
  const controller = new AbortController();

  fetchData({ signal: controller.signal })
    .then(data => setState(data))
    .catch(err => {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    });

  return () => controller.abort();
}, []);
```

---

### 2. Optional Chaining for Safe Property Access
**Problem:** `TypeError: Cannot read property 'x' of null`

**Solution:**
```javascript
// Bad
const name = user.profile.name;

// Good
const name = user?.profile?.name;
const name = user?.profile?.name ?? 'Unknown';
```

---

## 🗄️ Database Issues

### 1. Postgres Connection Timeout
**Problem:** `Connection timeout` or `ETIMEDOUT`

**Cause:** Missing DATABASE_URL or connection pool exhaustion

**Solution:**
```javascript
// Check .env file has DATABASE_URL
// Implement connection pooling

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Use pool, not individual clients
const result = await pool.query('SELECT * FROM users');
```

---

### 2. Drizzle ORM with Neon Serverless
**Problem:** `No pg_client_connection` or WebSocket errors

**Solution:**
```javascript
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon
if (!globalThis.WebSocket) {
  globalThis.WebSocket = ws as any;
}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);
```

---

## 🧪 Testing Issues

### 1. Playwright Timeout
**Problem:** `Test timeout exceeded` or `page.goto: Timeout`

**Cause:** Element not found or page load too slow

**Solution:**
```javascript
// Increase timeout globally in config
export default defineConfig({
  timeout: 30000,  // 30 seconds
});

// Or per-action
await page.waitForSelector('button.submit', {
  timeout: 10000
});

// Use waitForLoadState
await page.goto('https://example.com');
await page.waitForLoadState('networkidle');
```

---

### 2. Test Flakiness from Race Conditions
**Problem:** Tests pass sometimes, fail sometimes

**Solution:**
```javascript
// Bad - assumes instant render
await page.click('button');
const text = await page.textContent('.result');

// Good - wait for element
await page.click('button');
await page.waitForSelector('.result');
const text = await page.textContent('.result');

// Better - with explicit expectation
await page.click('button');
await expect(page.locator('.result')).toBeVisible();
await expect(page.locator('.result')).toHaveText('Expected');
```

---

## 🔐 Authentication Issues

### 1. Session Not Persisting
**Problem:** User logged out on page refresh

**Cause:** Session store not configured or cookie settings wrong

**Solution:**
```javascript
import session from 'express-session';
import pgSession from 'connect-pg-simple';

const PgSession = pgSession(session);

app.use(session({
  store: new PgSession({
    pool: pgPool,
    tableName: 'user_sessions'
  }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));
```

---

## 📦 Dependency Issues

### 1. Module Not Found After Install
**Problem:** `Cannot find module 'X'` after `npm install`

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Or for specific module
npm uninstall X
npm install X --save
```

---

### 2. Type Errors with @types Packages
**Problem:** TypeScript can't find types for installed package

**Solution:**
```bash
# Install types separately
npm install --save-dev @types/[package-name]

# Or declare module in .d.ts file
declare module 'package-name';
```

---

## 🎨 UI/UX Issues

### 1. Tailwind Classes Not Applied
**Problem:** Tailwind classes in JSX not showing styles

**Cause:** Class names dynamically constructed or purge misconfigured

**Solution:**
```javascript
// Bad - Tailwind won't detect
const btnClass = `bg-${color}-500`;

// Good - Full class names
const btnClass = color === 'blue'
  ? 'bg-blue-500'
  : 'bg-red-500';

// Or use safelist in tailwind.config.js
module.exports = {
  safelist: [
    'bg-blue-500',
    'bg-red-500',
  ]
};
```

---

## 🔄 Agent-Specific Issues

### 1. Agent Has No Context
**Problem:** Agent doesn't remember previous conversation

**Cause:** Agents are stateless by design

**Solution:**
```javascript
// Pass ALL context in agent invocation
Task({
  subagent_type: "qa-tester-universal",
  prompt: JSON.stringify({
    test_type: "browser",
    test_target: "login flow",
    project_path: "/full/path/to/project",
    project_context: {
      previous_tests: ["auth", "signup"],
      known_issues: ["session timeout on Safari"]
    }
  })
});
```

---

### 2. MCP Tool Not Available
**Problem:** Agent can't access mcp__[tool]

**Cause:** Tool requires API key or project-specific setup

**Solution:**
```javascript
// Check tool availability first
if (toolAvailable('mcp__firecrawl')) {
  // Use firecrawl
} else if (toolAvailable('mcp__brave-search')) {
  // Fallback to brave-search
} else {
  // Manual alternative - provide URL to user
}
```

---

## 🚀 Deployment Issues

### 1. Environment Variables Not Loading
**Problem:** `process.env.X is undefined` in production

**Solution:**
```bash
# Verify .env file exists
ls -la .env*

# Check if dotenv is configured
# In server entry file:
import 'dotenv/config';

# Or
import dotenv from 'dotenv';
dotenv.config();

# Verify env vars are set in hosting platform (Vercel, Netlify, etc.)
```

---

## 📝 Best Practices Reminders

### Test Consolidation Workflow
1. Create isolated test file (`feature-x.spec.ts`)
2. Run test, verify it passes
3. Add to `main-suite.spec.ts`
4. Delete individual test file
5. Re-run main suite to confirm correct merge
6. If old tests fail → Prompt user: "Design change or bug?"

### Self-Rating Protocol
- Rate every coding step 1-10
- Explain strengths (+points) and gaps (-points)
- Identify what would reach 10/10
- Target 9/10 before execution

### Agent Communication
- Use standard JSON handoff format
- Include full project context
- Specify expected response format
- Log to knowledge base after execution

---

## 🔍 Debugging Checklist

When something breaks:

1. **Check Recent Changes**
   - Git diff to see what changed
   - Review last commit

2. **Verify Environment**
   - .env file exists and has correct values
   - Dependencies installed (node_modules exists)
   - Database connection works

3. **Check Logs**
   - Browser console (F12)
   - Server console output
   - Database query logs

4. **Isolate the Problem**
   - Reproduce in minimal example
   - Test in isolation
   - Remove variables

5. **Search Knowledge Base**
   - Check `qa-knowledge-base.json` for patterns
   - Review this COMMON_SOLUTIONS.md
   - Search project issues/docs

6. **Spawn Debug Agent**
   - If still stuck, use debug-assistant agent
   - Provide full context and error details

---

**Note:** This file is a living document. Add new solutions as they're discovered!
