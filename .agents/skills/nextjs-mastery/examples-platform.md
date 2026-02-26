# Platform Examples

Caching, error handling, auth, i18n, security, and proxy.

## Table of Contents

- [Caching — fetch Options](#caching--fetch-options)
- [Caching — "use cache" Directive](#caching--use-cache-directive)
- [Error Handling](#error-handling)
- [Auth.js v5 Integration](#authjs-v5-integration)
- [Internationalization](#internationalization)
- [Security Headers (CSP)](#security-headers)
- [proxy.ts (replaces middleware.ts)](#proxyts)

---

## Caching — fetch Options

```typescript
// Uncached (default in v15+ — every request)
fetch(url);

// Explicitly cached (static)
fetch(url, { cache: "force-cache" });

// ISR (time-based)
fetch(url, { next: { revalidate: 60 } });

// Tag-based (invalidate on demand)
fetch(url, { next: { tags: ["products"] } });
```

```typescript
// Invalidation in Server Actions
"use server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data });
  revalidateTag("products");
  revalidatePath("/products");
}
```

---

## Caching — "use cache" Directive

Requires `cacheComponents: true` in `next.config.ts`.

```typescript
// Function-level caching
import { cacheLife, cacheTag } from 'next/cache'

export async function getProducts() {
  'use cache'
  cacheLife('hours')        // stale: 5min, revalidate: 1hr, expire: 1day
  cacheTag('products')
  return db.query('SELECT * FROM products')
}
```

```typescript
// Page-level caching
'use cache'
import { cacheLife } from 'next/cache'

export default async function Page() {
  cacheLife('days')
  const data = await fetchData()
  return <div>{data}</div>
}
```

```typescript
// Invalidation with updateTag (Server Actions only, read-your-writes)
"use server";
import { updateTag } from 'next/cache'

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });
  updateTag('products');  // immediately expires cache
}
```

**cacheLife profiles:**

| Profile   | stale  | revalidate | expire |
|-----------|--------|------------|--------|
| `seconds` | 30s    | 1s         | 1min   |
| `minutes` | 5min   | 1min       | 1hr    |
| `hours`   | 5min   | 1hr        | 1day   |
| `days`    | 5min   | 1day       | 1week  |
| `weeks`   | 5min   | 1week      | 30days |
| `max`     | 5min   | 30days     | 1year  |

---

## Error Handling

```typescript
// app/dashboard/error.tsx — must be 'use client'
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

```typescript
// app/global-error.tsx — catches root layout errors, must include <html>/<body>
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  )
}
```

```typescript
// app/blog/[slug]/not-found.tsx — shown when notFound() is called
export default function NotFound() {
  return <div>Post not found</div>
}
```

---

## Auth.js v5 Integration

```typescript
// auth.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
});
```

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

```typescript
// Server Component — check session
import { auth } from "@/auth";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");
  return <p>Hello {session.user?.name}</p>;
}
```

```typescript
// Server Action — protect mutations
"use server";
import { auth } from "@/auth";

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  // ...
}
```

---

## Internationalization

```typescript
// proxy.ts — detect locale and redirect
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'

const locales = ['en', 'de', 'fr']
const defaultLocale = 'en'

function getLocale(request: NextRequest) {
  const headers = { 'accept-language': request.headers.get('accept-language') ?? '' }
  const languages = new Negotiator({ headers }).languages()
  return match(languages, locales, defaultLocale)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasLocale = locales.some(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`)
  if (hasLocale) return

  const locale = getLocale(request)
  request.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}
```

```typescript
// app/[lang]/dictionaries.ts — server-only, zero client bundle
import 'server-only'

const dictionaries = {
  en: () => import('./dictionaries/en.json').then(m => m.default),
  de: () => import('./dictionaries/de.json').then(m => m.default),
}

export const getDictionary = async (locale: string) =>
  dictionaries[locale as keyof typeof dictionaries]()
```

```typescript
// app/[lang]/page.tsx
export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const dict = await getDictionary(lang)
  return <h1>{dict.home.title}</h1>
}

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'de' }, { lang: 'fr' }]
}
```

---

## Security Headers

```typescript
// next.config.ts — static CSP + recommended headers
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

export default {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}
```

---

## proxy.ts

Replaces `middleware.ts` in Next.js 16. Runs on Node.js (not Edge).

```typescript
// proxy.ts
import { NextResponse, NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // Example: redirect unauthenticated users
  const token = request.cookies.get('session')?.value
  if (!token && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

**Migration from middleware.ts:**
```bash
npx @next/codemod@canary middleware-to-proxy .
```
