---
name: nextjs-app-router-patterns
description: Next.js 15/16 App Router patterns for Server Components, streaming, parallel routes, intercepting routes, Server Actions, route handlers, caching, and metadata. Use when building Next.js applications, implementing SSR/SSG, choosing between Server and Client Components, or optimizing data fetching and caching.
allowed-tools: Read, Write, Edit, Glob, Grep
risk: low
source: community
---

# Next.js App Router Patterns (v15/16 + React 19)

## Critical Changes from v14

- **fetch is uncached by default** — opt in with `cache: 'force-cache'` or `next: { revalidate: N }`
- **GET Route Handlers are uncached** — opt in with `export const dynamic = 'force-static'`
- **params, searchParams, cookies(), headers() are async** — must `await` (sync access removed in v16)
- **`useActionState`** replaces `useFormState` — import from `react`, not `react-dom`
- **`use()` hook** — unwrap Promises in Client Components (for params, searchParams, passed data)
- **Parallel routes require `default.tsx`** — builds fail without them

## File Conventions

```
app/
├── layout.tsx          # Shared wrapper (persists across navigations)
├── template.tsx        # Re-mounted on every navigation
├── page.tsx            # Route UI
├── loading.tsx         # Suspense fallback
├── error.tsx           # Error boundary ('use client' required)
├── not-found.tsx       # 404 UI
├── route.ts            # API endpoint (no page.tsx in same dir)
├── default.tsx         # Parallel route fallback (required)
└── opengraph-image.tsx # OG image generation
```

## Patterns

### 1. Server Component + Suspense Streaming

```typescript
// app/products/page.tsx
import { Suspense } from 'react'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex gap-8">
      <FilterSidebar />
      <Suspense key={JSON.stringify(params)} fallback={<ProductListSkeleton />}>
        <ProductList category={params.category} page={Number(params.page) || 1} />
      </Suspense>
    </div>
  )
}

// Async Server Component — fetches its own data, streams in via Suspense
async function ProductList({ category, page }: { category?: string; page: number }) {
  const { products, totalPages } = await getProducts({ category, page })

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  )
}
```

### 2. Client Components + useActionState

```typescript
'use client'

import { useActionState } from 'react'
import { addToCart } from '@/app/actions/cart'

export function AddToCartButton({ productId }: { productId: string }) {
  const [state, action, isPending] = useActionState(
    () => addToCart(productId),
    null
  )

  return (
    <div>
      <button onClick={action} disabled={isPending} className="btn-primary">
        {isPending ? 'Adding...' : 'Add to Cart'}
      </button>
      {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
    </div>
  )
}
```

### 3. use() Hook — Unwrap Promises in Client Components

```typescript
// Server Component creates promise, Client Component unwraps it
export default async function Page() {
  const dataPromise = fetchAnalytics() // don't await — pass as promise
  return <AnalyticsChart dataPromise={dataPromise} />
}
```

```typescript
'use client'
import { use } from 'react'

// For async props passed from Server Components
export function AnalyticsChart({ dataPromise }: { dataPromise: Promise<Data> }) {
  const data = use(dataPromise) // suspends until resolved
  return <Chart data={data} />
}

// For params/searchParams in Client Component pages
export default function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <div>{id}</div>
}
```

### 4. Server Actions with Validation

```typescript
"use server";

import { z } from "zod";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function addToCart(productId: string) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) redirect("/login");

  try {
    await db.cart.upsert({
      where: { sessionId_productId: { sessionId, productId } },
      update: { quantity: { increment: 1 } },
      create: { sessionId, productId, quantity: 1 },
    });
    revalidateTag("cart");
    return { success: true };
  } catch {
    return { error: "Failed to add item to cart" };
  }
}

const CheckoutSchema = z.object({
  address: z.string().min(1, "Address is required"),
  payment: z.string().min(1, "Payment method is required"),
});

export async function checkout(formData: FormData) {
  const parsed = CheckoutSchema.safeParse({
    address: formData.get("address"),
    payment: formData.get("payment"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const order = await processOrder(parsed.data);
  redirect(`/orders/${order.id}/confirmation`);
}
```

### 5. Parallel Routes

Every `@slot` directory **must** have a `default.tsx` or the build will fail.

```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,  // app/dashboard/@analytics/
  team,       // app/dashboard/@team/
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  team: React.ReactNode
}) {
  return (
    <div className="dashboard-grid">
      <main>{children}</main>
      <aside>{analytics}</aside>
      <aside>{team}</aside>
    </div>
  )
}

// app/dashboard/@analytics/default.tsx — required
export default function Default() { return null }

// app/dashboard/@analytics/page.tsx
export default async function AnalyticsSlot() {
  const stats = await getAnalytics()
  return <AnalyticsChart data={stats} />
}

// app/dashboard/@analytics/loading.tsx — independent loading state
export default function AnalyticsLoading() { return <ChartSkeleton /> }
```

### 6. Intercepting Routes (Modal Pattern)

```
app/
├── @modal/
│   ├── (.)photos/[id]/page.tsx   ← intercepted (modal)
│   └── default.tsx               ← returns null
├── photos/[id]/page.tsx          ← full page (direct nav / refresh)
└── layout.tsx                    ← renders {children} + {modal}
```

```typescript
// app/@modal/(.)photos/[id]/page.tsx
export default async function PhotoModal({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const photo = await getPhoto(id)
  return <Modal><PhotoDetail photo={photo} /></Modal>
}

// app/photos/[id]/page.tsx — full page fallback on direct nav
export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const photo = await getPhoto(id)
  return (
    <div>
      <PhotoDetail photo={photo} />
      <RelatedPhotos photoId={id} />
    </div>
  )
}
```

### 7. Route Handlers with Auth + Validation

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  const products = await db.product.findMany({
    where: category ? { category } : undefined,
    take: 20,
  });
  return NextResponse.json(products);
}

const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  price: z.number().positive(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = CreateProductSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const product = await db.product.create({ data: parsed.data });
  return NextResponse.json(product, { status: 201 });
}
```

### 8. Metadata and SEO

```typescript
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return {}

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.image, width: 1200, height: 630 }],
    },
  }
}

export async function generateStaticParams() {
  const products = await db.product.findMany({ select: { slug: true } })
  return products.map((p) => ({ slug: p.slug }))
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()
  return <ProductDetail product={product} />
}
```

## Caching (v15+ defaults)

**fetch is uncached by default.** You must opt in to caching.

```typescript
// Uncached (default in v15+, every request)
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

## Rules

### Do

- **Server Components by default** — add `'use client'` only for interactivity
- **Colocate data fetching** — fetch in the component that uses the data
- **Wrap slow data in Suspense** — stream instead of blocking the whole page
- **Validate all inputs** — Zod in Server Actions and route handlers
- **Check auth in mutations** — every POST/PUT/DELETE needs a session guard
- **Use `notFound()`** — when a DB lookup returns null in a page component
- **Provide `default.tsx`** — for every parallel route slot
- **Await all dynamic APIs** — params, searchParams, cookies(), headers()

### Don't

- **Don't assume fetch is cached** — it's not since v15; opt in explicitly
- **Don't pass non-serializable data across the Server/Client boundary** — no functions, classes, Dates
- **Don't use hooks in Server Components** — no useState, useEffect, useRef
- **Don't fetch in Client Components** — lift to Server Component parent or use a query library
- **Don't skip error boundaries** — add `error.tsx` (`'use client'` required) per route segment
- **Don't pass raw user input to the database** — always validate with Zod first
- **Don't use `useFormState`** — it's deprecated; use `useActionState` from `react`
