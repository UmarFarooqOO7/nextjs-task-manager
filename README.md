# Agent TaskFlow

A powerful task management platform for **humans and AI agents** to collaborate via MCP (Model Context Protocol).

## Overview

Agent TaskFlow enables:
- **Task Management** — Create, organize, and track tasks with rich descriptions, priorities, and due dates
- **Human-AI Collaboration** — Assign tasks to human team members or autonomous AI agents
- **MCP Integration** — Full MCP 2.1 support with OAuth 2.1 authentication
- **Real-time Updates** — Live task synchronization via SSE
- **Autonomous Agents** — AI agents with access to files, code execution, and MCP tools

## Features

- 🎯 **Multi-project support** — Organize tasks across different projects
- 🤖 **AI Agent Framework** — Agents can autonomously claim and complete tasks using Claude or any LLM
- 🔐 **OAuth 2.1 + PKCE** — Secure authentication for MCP clients and agents
- 🧠 **Full-text Search** — Find tasks and projects instantly
- 👥 **Team Collaboration** — Assign tasks, claim work, leave comments
- 🏷️ **Labels & Filters** — Organize tasks with custom labels and status filters
- ⚡ **Real-time Sync** — SSE streaming for live updates
- 📱 **Kanban Board** — Visual task management with drag-and-drop

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** Auth.js v5 (GitHub OAuth)
- **Database:** Turso SQLite (@libsql/client)
- **UI:** React 19, shadcn/ui, Tailwind CSS v4
- **MCP:** @modelcontextprotocol/sdk with mcp-handler
- **Real-time:** Server-Sent Events (SSE)

## Quick Start

### Prerequisites
- Node.js 18+
- npm/yarn
- Turso database (or local SQLite fallback)

### Installation

```bash
# Clone and install
git clone https://github.com/UmarFarooqOO7/agent-taskflow.git
cd agent-taskflow
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your GitHub OAuth and Turso credentials

# Start development server
npm run dev
```

Visit `http://localhost:3000` to get started.

## MCP Integration

Agent TaskFlow exposes a full MCP server at `/api/mcp/mcp`:

### Available Tools

**Project Management:**
- `list_projects` — Get all projects
- `search_projects` — Find projects by name/description
- `create_project` — Create new project
- `update_project` — Update project details
- `switch_project` — Switch active project scope
- `get_project` — Get project info

**Task Management:**
- `list_tasks` — List tasks with filters
- `search_tasks` — Full-text search tasks
- `get_task` — Get task details
- `create_task` — Create new task
- `update_task` — Update task status/priority
- `claim_task` — Claim task as an agent
- `add_comment` — Add task comments
- `delete_task` — Delete task

### OAuth Authentication

MCP clients authenticate via OAuth 2.1 with PKCE:

```bash
# 1. Register as a client
curl -X POST http://localhost:3000/api/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "my-agent",
    "redirect_uris": ["http://localhost:8080/callback"]
  }'

# 2. Use client_id + OAuth flow to get access token
# 3. Call MCP tools with Bearer token
```

## Building Agents

See the agent architecture documentation for building AI agents that:
- Authenticate via OAuth
- Poll for tasks
- Execute work autonomously
- Update task status and add comments

## Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npx tsc --noEmit # Type check
```

## Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FUmarFarooqOO7%2Fagent-taskflow)

Or deploy anywhere that supports Node.js with Turso database.

## License

MIT
