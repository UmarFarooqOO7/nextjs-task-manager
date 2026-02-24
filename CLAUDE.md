# AI-Native Task Manager — Project Instructions

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui (radix-ui v1, class-variance-authority, lucide-react)
- **Auth:** Auth.js v5 (next-auth@beta) with GitHub OAuth, JWT strategy
- **Database:** @libsql/client (Turso SQLite) — cloud DB via env vars, `file:tasks.db` fallback for local dev
- **Theming:** next-themes (defaultTheme="dark")
- **MCP:** mcp-handler package, Streamable HTTP transport at `/api/mcp/[transport]`

## Build & Dev

```bash
npm run dev        # Start dev server
npm run build      # Production build
npx tsc --noEmit   # Type check without emitting
```

- Use `bunx --bun shadcn@latest` (not `bun dlx`) for adding shadcn components
- bun is at `/c/Users/Arrha/.bun/bin/bun` (not in PATH); npm/npx work fine

## Project Structure

```
app/
  layout.tsx                  # Root layout with header, auth, realtime providers
  login/page.tsx              # GitHub OAuth sign-in page
  projects/
    page.tsx                  # Project list
    new/page.tsx              # Create project
    [id]/
      page.tsx                # Project dashboard (stats, recent tasks, agents)
      board/page.tsx          # Kanban board view
      settings/               # API keys management
      tasks/
        page.tsx              # Task list with pagination, filters, search
        new/page.tsx          # Create task
        [taskId]/page.tsx     # Task detail with comments
        [taskId]/edit/page.tsx
  api/
    auth/[...nextauth]/       # NextAuth route handlers
    mcp/[transport]/route.ts  # MCP server (bearer token auth)
    tasks/
      search/route.ts         # FTS search API
      stream/route.ts         # SSE real-time events (scoped by projectId)
  components/                 # App-specific components
components/ui/                # shadcn/ui generated components
lib/
  auth.ts                     # NextAuth config (GitHub provider, JWT)
  db.ts                       # libsql client + initDb() + dbReady promise
  data.ts                     # All async data functions (each awaits dbReady)
  actions.ts                  # All Server Actions ('use server')
  api-auth.ts                 # API key generation, hashing, validation
  emitter.ts                  # EventEmitter for SSE task events
  types.ts                    # Shared TypeScript types
  utils.ts                    # shadcn cn() utility
middleware.ts                 # Auth middleware (excludes /api/ routes)
```

## Key Patterns

### Server Actions
- All in `lib/actions.ts` with `'use server'` directive
- Every mutating action calls `requireProjectAccess(projectId)` for auth + ownership
- Task mutations also call `requireTaskInProject(taskId, projectId)` for binding verification
- Actions bound via `.bind(null, id)` in Server Components before passing to Client Components
- All mutations emit SSE events via `emitTaskEvent()` with `projectId` for scoping

### Data Access
- All functions in `lib/data.ts` are async; each starts with `await dbReady`
- Use parameterized queries everywhere (no string interpolation in SQL)
- Use `client.batch()` for combining queries into single round-trips
- Indexes exist for common query patterns (project+status, project+position, owner, key_hash, etc.)

### Authentication & Authorization
- `middleware.ts` protects all non-API routes via NextAuth
- API routes use their own auth: session-based for search/stream, bearer token for MCP
- `requireProjectAccess()` — checks auth + verifies user owns the project
- `requireTaskInProject()` — verifies task belongs to the specified project
- MCP uses `withMcpAuth` with API key validation; `getAuth()` validates types at runtime

### SSE Real-Time
- Client connects via `TaskRealtime` component which extracts projectId from URL pathname
- SSE endpoint requires valid projectId and verifies ownership
- Events strictly filtered: `payload.projectId !== projectId` rejects cross-project leaks
- Presence broadcast scoped by projectId

### MCP Server
- All tool handlers wrapped in try/catch returning `{ isError: true }` on failure
- All mutations emit SSE events (including claim_task and add_comment)
- Error responses always include `isError: true`
- `getAuth()` validates runtime types for projectId (number) and agentName (string)

## Conventions

- Delete confirmation uses shadcn Dialog; action is async server action passed as prop
- `useActionState` for form handling with server actions
- Forms use `formAction` prop pattern with `SubmitButton` using `useFormStatus`
- Responsive grids: `grid-cols-1 sm:grid-cols-N` pattern
- All interactive icon-only buttons need `aria-label`
- Decorative icons get `aria-hidden="true"`
- Drag handles are dedicated `<button type="button">` elements with `aria-label="Drag to reorder"`
- Activity feed tick interval only runs when sheet is open (performance)
- Avatars use `next/image` with `remotePatterns` for GitHub CDN

## Don'ts

- Don't use `better-sqlite3` — we use `@libsql/client`
- Don't use `<img>` tags — use `next/image`
- Don't skip auth/ownership checks in server actions or API routes
- Don't use string interpolation in SQL queries
- Don't use `asChild` on disabled buttons (breaks in radix)
- Don't hardcode paths — extract projectId from context
