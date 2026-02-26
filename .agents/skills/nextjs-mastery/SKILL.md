---
name: nextjs-mastery
description: Next.js 15/16 App Router patterns and best practices — Server Components, streaming, parallel routes, intercepting routes, Server Actions, route handlers, caching ("use cache"), metadata, Auth.js v5, i18n, error handling, security headers, proxy.ts, React Compiler, and Turbopack. Use when building Next.js applications, implementing SSR/SSG, choosing between Server and Client Components, optimizing data fetching and caching, setting up authentication, or configuring security.
allowed-tools: Read, Write, Edit, Glob, Grep
risk: low
source: community
---

# Next.js Mastery (v15/16 + React 19)

Code examples:
- [examples-core.md](examples-core.md) — Components, routing, data fetching, mutations
- [examples-platform.md](examples-platform.md) — Caching, errors, auth, i18n, security, proxy

## Breaking Changes from v14

| Change | Migration |
|--------|-----------|
| fetch is **uncached by default** | Opt in: `cache: 'force-cache'` or `next: { revalidate: N }` |
| GET Route Handlers uncached | Opt in: `export const dynamic = 'force-static'` |
| params, searchParams are **Promises** | `await params` in Server Components, `use(params)` in Client Components |
| cookies(), headers() are **async** | Must `await` — sync access removed in v16 |
| `useFormState` deprecated | Use `useActionState` from `react` (not `react-dom`) |
| `middleware.ts` deprecated | Rename to `proxy.ts`, export `proxy` function (runs on Node.js, not Edge) |
| `next/image` `priority` deprecated | Use `preload` prop instead |
| Parallel routes require `default.tsx` | Builds fail without them — add to every `@slot` directory |

**Migration codemod:** `npx @next/codemod@canary middleware-to-proxy .`

## File Conventions

```
app/
├── layout.tsx          # Shared wrapper (persists across navigations)
├── template.tsx        # Re-mounted on every navigation
├── page.tsx            # Route UI
├── loading.tsx         # Suspense fallback
├── error.tsx           # Error boundary ('use client' required)
├── not-found.tsx       # 404 UI
├── global-error.tsx    # Root layout error boundary (must include <html>/<body>)
├── route.ts            # API endpoint (no page.tsx in same dir)
├── default.tsx         # Parallel route fallback (required per slot)
├── opengraph-image.tsx # OG image generation
└── proxy.ts            # Network proxy (replaces middleware.ts)
```

## Patterns

### 1. Server Components (default)

Use for data fetching, secrets, heavy computation. Wrap slow data in `<Suspense>` to stream. Colocate data fetching — fetch in the component that renders the data. See [examples: streaming](examples-core.md#server-component--suspense-streaming).

### 2. Client Components

Add `'use client'` only for interactivity (hooks, event handlers, browser APIs). Use `useActionState` for Server Action state (replaces `useFormState`). Use `use()` to unwrap Promises passed from Server Components. See [examples: client](examples-core.md#client-component--useactionstate) and [examples: use()](examples-core.md#use-hook).

### 3. Server Actions

Mark with `'use server'`. Validate all inputs with Zod. Check auth before mutations. Return errors as values — don't throw for expected failures. Call `revalidateTag`/`revalidatePath` after mutations. See [examples: actions](examples-core.md#server-actions-with-validation).

### 4. Route Handlers

Auth guard on every POST/PUT/DELETE. Zod schema validation on request body. Return proper status codes (201 created, 400 bad request, 401 unauthorized, 404 not found). GET handlers are uncached by default. See [examples: route handlers](examples-core.md#route-handlers).

### 5. Parallel Routes

Use `@slot` directories for independent loading states. Every slot **must** have `default.tsx`. Each slot streams independently via its own `loading.tsx`. See [examples: parallel](examples-core.md#parallel-routes).

### 6. Intercepting Routes

Use `(.)` prefix to intercept same-level routes (modals). Provide full-page fallback for direct navigation and refresh. Always include `default.tsx` in the `@modal` slot. See [examples: intercepting](examples-core.md#intercepting-routes).

### 7. Metadata & SEO

Use `generateMetadata` for dynamic per-page metadata. Use `generateStaticParams` for static generation. Call `notFound()` when data doesn't exist. See [examples: metadata](examples-core.md#metadata-and-seo).

## Caching

### fetch (v15+ defaults)

fetch is **uncached by default**. Opt in explicitly:

| Pattern | Option |
|---------|--------|
| Uncached (default) | `fetch(url)` |
| Static | `fetch(url, { cache: 'force-cache' })` |
| ISR | `fetch(url, { next: { revalidate: 60 } })` |
| Tagged | `fetch(url, { next: { tags: ['products'] } })` |

### "use cache" directive (v16)

Enable with `cacheComponents: true` in `next.config.ts`. Replaces `unstable_cache`.

- Apply at file, component, or function level
- Configure with `cacheLife()` and `cacheTag()` from `next/cache`
- Cannot call `cookies()`/`headers()` inside — pass as arguments
- Invalidate with `updateTag()` (read-your-writes) or `revalidateTag()`

| Profile | stale | revalidate | expire |
|---------|-------|------------|--------|
| `seconds` | 30s | 1s | 1min |
| `minutes` | 5min | 1min | 1hr |
| `hours` | 5min | 1hr | 1day |
| `days` | 5min | 1day | 1week |
| `weeks` | 5min | 1week | 30days |
| `max` | 5min | 30days | 1year |

See [examples: use cache](examples-platform.md#caching--use-cache-directive).

## Error Handling

- **Expected errors** — return as values from Server Actions (`{ message: "..." }`), not throw
- **`error.tsx`** — must be `'use client'`; catches errors in route segment children (not the layout at the same level)
- **`global-error.tsx`** — catches root layout errors; must include `<html>` and `<body>`
- **`not-found.tsx`** — shown when `notFound()` is called
- **Production** — only `digest` (hash) is sent to client, not the error message
- **`reset()`** — re-render the segment without a full page reload

See [examples: errors](examples-platform.md#error-handling).

## Auth (Auth.js v5)

- Single `auth()` function replaces `getServerSession`, `getSession`, `useSession`
- JWT strategy — no DB adapter needed
- `AUTH_` prefixed env vars auto-inferred by providers
- Protect routes in `proxy.ts` via `authorized` callback
- **Always verify auth in Server Actions individually** — don't rely solely on proxy

See [examples: auth](examples-platform.md#authjs-v5-integration).

## Security

- Set CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy via `headers()` in `next.config.ts`
- Nonce-based CSP in `proxy.ts` for strict mode (disables static rendering)
- `NEXT_PUBLIC_` values are frozen at build time — use API routes for runtime-configurable public values
- All `.env*.local` files in `.gitignore`

See [examples: security](examples-platform.md#security-headers).

## Internationalization

- `app/[lang]/` segment + `proxy.ts` for locale detection/redirect
- Dictionary pattern with `server-only` (zero client bundle)
- `generateStaticParams` for static rendering per locale
- Libraries: next-intl, next-international, paraglide-next

See [examples: i18n](examples-platform.md#internationalization).

## Tooling (v16)

| Tool | Status | Config |
|------|--------|--------|
| **Turbopack** | Default bundler | Opt out: `--webpack` |
| **React Compiler** | Stable, opt-in | `reactCompiler: true` in next.config.ts |
| **proxy.ts** | Replaces middleware.ts | Node.js runtime (not Edge) |

React Compiler auto-memoizes components and hooks — eliminates manual `useMemo`, `useCallback`, `React.memo`.

## Testing

| Layer | Tool | Use for |
|-------|------|---------|
| Unit/Integration | Vitest + React Testing Library | Client Components, sync Server Components, utilities |
| E2E | Playwright | Async Server Components, full-stack flows, hydration |

Playwright for async Server Components because it makes real HTTP requests — unit test runners can't simulate the server-to-client pipeline.

## Rules

### Do

- **Server Components by default** — `'use client'` only for interactivity
- **Colocate data fetching** — fetch in the component that uses it
- **Wrap slow data in Suspense** — stream, don't block
- **Validate all inputs** — Zod in Server Actions and route handlers
- **Check auth in every mutation** — session guard in actions and route handlers
- **Use `notFound()`** — when a DB lookup returns null
- **Provide `default.tsx`** — for every parallel route slot
- **Await all dynamic APIs** — params, searchParams, cookies(), headers()
- **Return errors as values** — from Server Actions, don't throw for expected failures
- **Set security headers** — CSP, X-Frame-Options, HSTS in production

### Don't

- **Don't assume fetch is cached** — uncached since v15; opt in explicitly
- **Don't pass non-serializable data across Server/Client boundary** — no functions, classes, Dates
- **Don't use hooks in Server Components** — no useState, useEffect, useRef
- **Don't fetch in Client Components** — lift to Server Component parent or use a query library
- **Don't skip error boundaries** — `error.tsx` (`'use client'`) per route segment
- **Don't pass raw input to the database** — always validate with Zod
- **Don't use `useFormState`** — deprecated; use `useActionState` from `react`
- **Don't use `middleware.ts`** — deprecated; rename to `proxy.ts`
- **Don't call cookies()/headers() inside `'use cache'`** — read outside, pass as arguments
