# Session Brief — Infinity AI (formerly Jarvis)
LAST_UPDATED: 2026-08-14
> Read FIRST every session (alongside **KNOWLEDGE.md**). **Updated on EVERY change** — this is how sessions feel like one chat.
> This file must ALWAYS reflect the project *right now*. After every change: append to Change record, refresh Project state.
> **Never store personal trivia here** (e.g. what to call the user) — that's unnecessary space. Only state, changes, and how-it-works.

## Just did (last action)
- Completed **Phase 1 (Foundation & Activity Integration)** of the 12-feature Projects plan:
  - 1.1 Mounted `ProjectActivity` component in home.tsx (render branch for `activeProjectView === 'activity'`)
  - 1.2 Added `sourceType`/`sourceRef` provenance columns to global `user_memories` table + populated in `chat.ts` extraction
  - 1.3 Extended `VALID_TYPES` enum in `project-activity.ts` with 8 new types: `faq_generated`, `conflict_detected`, `cleanup_ran`, `import_completed`, `export_completed`, `automation_triggered`, `connector_sync`, `shared_access`
  - 1.4 Created `projectShares` schema + API (GET/POST/DELETE `/projects/:id/shares`) with `accessToken` (uuid), `permission` enum (read|collaborator), `expiresAt`
  - 1.5 Created `projectExports` schema + API (POST `/projects/:id/export`, GET `/projects/:id/export/:exportId/status`, GET `/projects/:id/export/:exportId/download`, POST `/projects/import`)
  - 1.6 Added EN + NL i18n keys for all 10 new feature areas: timeline, chatbot, faq, conflict, cleanup, export, share, automation, connector, overview
- All Phase 1 backend/schema work verified: `pnpm run typecheck` passes for infinity artifact, build passes

## Project state — right now
- **Projects System Phase 1**: COMPLETE — Activity view mounted, global memories have provenance, activity types extended, sharing/export infrastructure ready
- **Build Studio agentic loop**: COMPLETE - frontend consumes SSE from `/build/agent` endpoint for true autonomous agent behavior
- **Infinity Books** — live end-to-end run pending (needs server `.env`)
- **Google Stitch Phase 1**: COMPLETE — 5 prompts + page inventory written to `docs/google-stitch-prompts/`

## Change record (newest first — EVERY change logged here, cap ~15)
- 2026-08-14: Phase 1.6 — Added EN + NL i18n keys for 10 new project features (timeline, chatbot, faq, conflict, cleanup, export, share, automation, connector, overview) in `artifacts/infinity/src/lib/i18n.tsx`
- 2026-08-14: Phase 1.5 — Created `projectExports` schema + API (export/import endpoints), wired in `index.ts` + `auto-migrate.ts`
- 2026-08-14: Phase 1.4 — Created `projectShares` schema + API (share CRUD endpoints), wired in `index.ts` + `auto-migrate.ts`
- 2026-08-14: Phase 1.3 — Extended `VALID_TYPES` in `project-activity.ts` with 8 new enum values for upcoming features
- 2026-08-14: Phase 1.2 — Added `sourceType`/`sourceRef` to `user_memories` schema + `memories.ts` route + `chat.ts` extraction
- 2026-08-14: Phase 1.1 — Mounted `ProjectActivity` component in `home.tsx` for `activeProjectView === 'activity'`
- 2026-08-14: Rename Jarvis → Infinity AI complete (269 files). Backend routes/, config/, imports. Frontend artifact/, components/, hooks/, manifest.json. DB schema jarvisSettings→infinitySettings, owner enum. API spec /jarvis/→/infinity/ + regenerated clients. Docs updated. Pre-existing test errors unchanged.
- 2026-08-14 Ran 6 agentic-loop integration tests (5 required + 1 bonus) — ALL PASS via `scripts/run-agent-tests.sh` (Node --test + tsx). Test file: `src/routes/infinity/__tests__/agent-loop-integration-direct.test.ts`.
- 2026-08-14 Rewired build-studio.tsx to /build/agent SSE endpoint: replaced runAutoPipeline with runAgentLoop, removed IterateResponse, updated UI text, added 4 i18n keys EN+NL, typecheck+build PASS. Commit 2a7be1a (pushed to abdulmohammedsecrets6/survey-automatically branch agentic-build-development).
- 2026-08-13 Phase M (project activity) completed: frontend ActivityRecord component with cursor pagination + search + load-more + emoji icons, `projectActivity.*` i18n (17 keys EN/NL), gallery/home/home-page wiring for 'activity' section; logActivity integrated across all 7 mutating route files (projects, memories, instructions, tasks, research, conversations, files); Drizzle enum typing fixed with `as const`. Build passes.
- 2026-08-12 Phase L (AI Context Pipeline) implemented: `lib/project-context.ts` assembles six scoped sources (identity, instructions, memory, files w/ text excerpt, history from other project chats, research runs) into the PROJECT CONTEXT block; `chat.ts` `buildProjectContext` now delegates to it; all queries strictly filtered by projectId. Phase I rename bug fixed (keyed on files.id, not join id). typecheck + build pass for both packages.
- 2026-08-12 Chat-shell hardcoded-color cleanup verified: `pnpm run typecheck` and `git diff --check` pass; user bubble, header actions (GroupSettings/ConversationActions), voice/camera back buttons, and the settings avatar badge now use theme tokens instead of hardcoded light/dark hexes.
- 2026-08-12 Infinity AI composer cleanup: the input now uses a centered max-width surface with neutral theme tokens instead of competing hardcoded light/dark pill styles.
- 2026-08-12 Infinity AI conversation-feed cleanup: assistant content now sits in a bounded reading column, user bubbles have a readable maximum width, and feed spacing is less cramped.
- 2026-08-12 Infinity AI Projects cleanup: the Projects section starts collapsed so the conversation list remains the primary sidebar focus.

## Active threads
- **Phase 2** (Timeline + Chatbot) — ready to start after Phase 1 completion
- **Phase 3** (FAQ + Conflict Detection + Source Attribution) — can proceed in parallel with Phase 2
- **Phase 4** (Mindmap + Cleanup) — can proceed in parallel with Phase 2
- **Phase 5** (Connectors + Automations) — needs Phase 1 export schema + Phase 3 conflict detection
- **Phase 6** (Sharing + Overview) — needs Phase 1 sharing + Phase 5 automation logging
- **Build Studio reliability**: visible progress transcript, plan/scaffold error handling, cancellation, and bounded self-review pipeline are implemented and verified; no active code changes remain.
- **Infinity Books** — live end-to-end run pending (needs server `.env`).
- **Google Stitch Phase 2** — await user request to use MCP to inspect generated designs and implement them

## Next actions
1. **Start Phase 2.1** — Timeline UI enhancements in `artifacts/infinity/src/components/projects/project-activity.tsx`: add date-grouping (bucket by day), type filter chips, deep-link navigation
2. **Start Phase 2.2** — Create `useProjectActivity` hook in `artifacts/infinity/src/hooks/useProjectActivity.ts` for shared fetch logic
3. **Start Phase 2.3** — Create `project-chatbot.ts` API route for read-only SSE chatbot
4. **Start Phase 2.4** — Create `project-chatbot.tsx` UI component with citation chips
5. **Start Phase 2.5** — Wire chatbot into project home (`project-home.tsx`, `project-gallery.tsx`)

## Locked decisions
- Continuity: KNOWLEDGE.md + session-brief.md replace the old logs; raw history in `archive/`.
- Memory rule: no personal trivia — only project state, changes, and how-it-works.
- Budget: 0 euro constraint — all services/APIs/hosting/libraries must be permanently 100% free.
- Git push: use `mine` remote (abdulmohammedsecrets6/survey-automatically), NOT origin (kasper-kal/Infinity AI — read-only for this token).
- After EVERY response: `git add -A && git commit -m "<what I just did>" && git push mine agentic-build-development`

## Project feature backlog (new — from user)
1. **Project Timeline** — chronological git-commit-style view of all project activity (conversations, files, memories, research, tasks); click an event → jump to that item.
2. **Project Chatbot (read-only)** — conversational assistant with read-only access to everything in the project (chats, files, memories, research, etc.).
3. **AI-generated Project FAQ** — auto-generated Q&A like "What's the goal of this project?" from project context.
4. **Conflict Detection** — spot contradictions across sources (e.g., project memory says PostgreSQL but yesterday's chat says MongoDB).
5. **"Explain This" on Mindmap** — click a connection (e.g., README.md ↔ memory) → AI explains the relationship.
6. **Source Attribution** — every memory/fact shows exact provenance (which conversation, file, line, timestamp it came from).
7. **Project Cleanup** — one-click scan for: duplicate files, outdated memories, unresolved questions, contradictory decisions.
8. **Project Import/Export** — import from GitHub (and others); export entire project as `.zip`.
9. **Project Sharing** — share a project with read-only or collaborator permissions.
10. **Automations** — scheduled triggers (e.g., "Every Monday 09:00 → summarize today's Calendar agenda → push notification").
11. **Connectors** — GitHub, Google Drive, Figma, Canva, Google Calendar, Gmail, etc. (replacing ad-hoc Settings integrations).
12. **Infinity Overview Menu** — global dashboard showing everything Infinity AI is doing right now (researching, building, etc.).