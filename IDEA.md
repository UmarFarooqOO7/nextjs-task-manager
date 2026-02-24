# Product Idea: AI-Native Project & Task Manager

## Core Concept
A task/project manager designed for both humans and AI agents.
Humans see what's happening in real-time. AI agents do the work via MCP.

---

## How It Works
- **Humans** use the web UI to create projects, monitor progress, review tasks
- **AI agents** connect via an MCP server to create, update, and complete tasks
- Both interact with the same data — humans see agent activity live

---

## Key Features (rough)

### For Humans
- Projects with boards/lists (already built)
- Real-time activity feed — see what agents are doing
- Assign tasks to agents or humans
- Approve/reject agent actions (optional gating)
- Audit log of all agent activity

### For AI Agents (MCP Server)
- `list_projects` — get all projects
- `list_tasks` — get tasks for a project (filter by status, priority)
- `create_task` — create a new task
- `update_task` — update title, description, status, priority
- `complete_task` — mark a task done
- `add_comment` — leave a note on a task
- `claim_task` — agent assigns itself to a task

### Authentication
- Humans: standard auth (email/password or OAuth)
- Agents: API key per project (scoped permissions)

---

## Multi-tenancy
- Each user has their own workspace
- Invite team members (humans or agents)
- Each AI agent gets an API key tied to a workspace

---

## Tech Direction
- Keep Next.js + Turso (already deployed)
- MCP server: separate endpoint or same app at `/mcp`
- SSE already built — reuse for live agent activity feed
- Agent identity shown in activity (e.g. "Claude created 'Fix login bug'")

---

## Open Questions
- Should agents work autonomously or require human approval per action?
- How to handle agent auth — per-project API keys or OAuth?
- Separate MCP server or bundled into the Next.js app?
- Pricing model if this becomes a real product?

---

## Inspiration
- Linear (for humans)
- Claude Code task tool (for agents)
- Something in between — visible, auditable, collaborative

---

*Written: 2026-02-24 — top of head idea, not committed to anything yet*
