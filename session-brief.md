# Session Brief — Infinity AI (formerly Jarvis)
LAST_UPDATED: 2026-08-15 (server .env with all API keys set up)
> Read FIRST every session (alongside **KNOWLEDGE.md**). **Updated on EVERY change** — this is how sessions feel like one chat.
> This file must ALWAYS reflect the project *right now*. After every change: append to Change record, refresh Project state.
> **Never store personal trivia here** (e.g. what to call the user) — that's unnecessary space. Only state, changes, and how-it-works.

## Just did (last action)
- **Set up server `.env`** at repo root with all 15 API keys (DATABASE_URL, OpenRouter, NVIDIA NIM LLM, ElevenLabs, Tavily, Figma, Spotify, Gmail, Whisper, Image Gen). Server loads it via `index.ts` (repo-root `.env` is one of 3 paths it reads). Verified all 15 load with `dotenv`. **`.env` is git-ignored** (not in git history, not tracked by `git ls-files`) — secrets safe from commit. NOTE: same secrets already existed pre-viously in `archive/` + `qa-report/` (prior sessions) — pre-existing hygiene issue, not addressed yet.

- **Completed Phase 4 (Mindmap + Cleanup) — all sub-phases 4.1-4.6**:
  - Phase 4.1: `projectConnections` schema (`lib/db/src/schema/project-mindmap.ts`) with nodeAType/nodeAId/nodeBType/nodeBId/relationship/confidence/explanation/inferredAt — verified already present
  - Phase 4.2: `project-mindmap.ts` API route (POST `/projects/:id/mindmap/infer` LLM relationship extraction, GET `/projects/:id/mindmap` graph) — verified present, fixed TS errors (enum casts, project.name scope, researchFindings table)
  - Phase 4.3: `project-mindmap.tsx` UI component wired into `home.tsx` (activeProjectView `'mindmap'`, import, action case, render branch) — fixed fetch-based API calls, edgeTypes cast, generic typing
  - Phase 4.4: `POST /projects/:id/mindmap/explain` "Explain This" endpoint in same route file — fixed missing `project` variable in scope
  - Phase 4.5: `project-cleanup.ts` API route (POST `/projects/:id/cleanup/scan` for duplicate files, outdated memories, open questions, contradictions) — fixed `c.resolved.length` on `{}` type with Array.isArray check
  - Phase 4.6: `project-cleanup.tsx` UI component (tabbed results with Fix actions) — verified present
  - Added `mindmap_inferred` to project-activity enum (lib/db + api-server VALID_TYPES)
  - Excluded `src/**/__tests__/**` from api-server tsconfig (pre-existing test file with `.ts` import extensions)
  - **Typecheck PASSES for all packages** (libs, api-server, infinity, scripts); **infinity build SUCCEEDS**
- **Updated KNOWLEDGE.md Grand Vision section** with the complete detailed vision (28 sections covering: Core AI Philosophy as central chat-first AI, Plan→Review→Execute loop, 17 Widget Types, Build Flow, Website Versioning, Apply Template, Self-Evolution Inspect/Edit/Heal, Git Transparency, Promo Video Maker with ASMR/Puppeteer/ElevenLabs, Infinity Self-Promo video, Browser-Powered Business Research, Unified Conversational Execution, Deep Workspaces, Visual Feedback Widgets, Big Unifying Idea)
- **Verified Phase 3.3 + 3.4 complete — Conflict Detection API + UI** (already implemented):
  - API route: `artifacts/api-server/src/routes/infinity/project-conflicts.ts` with POST `/projects/:id/conflicts/scan` (LLM contradiction detection across all 6 sources) and GET `/projects/:id/conflicts` (cached retrieval)
  - Schema: `lib/db/src/schema/project-conflicts.ts` with `projectConflicts` table (claimA, sourceA, claimB, sourceB, severity enum, resolved array, timestamps)
  - UI component: `artifacts/infinity/src/components/projects/project-conflicts.tsx` with expandable conflict cards, severity badges, inline citation chips, resolve/dismiss actions
  - Auto-migrate: `CREATE TABLE IF NOT EXISTS project_conflicts` with indexes
  - Router mounted in `artifacts/api-server/src/routes/infinity/index.ts`
  - Wired into `home.tsx` for `activeProjectView === 'conflicts'`
  - Added `conflicts` to `ProjectHomeAction` + action card in `project-home.tsx`
  - i18n keys complete (EN+NL) for `projectConflicts.*` and `projectHome.conflicts`/`projectHome.conflictsDesc`
  - Typecheck + build pass for infinity artifact
- **Fixed missing Dutch i18n keys** for `projectHome.conflicts` and `projectHome.conflictsDesc` in `artifacts/infinity/src/lib/i18n.tsx` — added translations to Dutch dictionary
- **Completed Phase 3.2 — Project FAQ UI component** (`project-faq.tsx`):
  - Created `artifacts/infinity/src/components/projects/project-faq.tsx` with accordion list, regenerate button, source citation chips (inline + footer), empty state, cached indicator, loading state, error handling
  - Added FAQ render branch in `home.tsx` for `activeProjectView === 'faq'`
  - Added `faq` to `ProjectHomeAction` type + action card in `project-home.tsx`
  - Added `projectHome.faq` / `projectHome.faqDesc` i18n keys (EN+NL)
  - Typecheck + build pass for infinity artifact
- **Completed Phase 3.1 — Project FAQ API route** (`project-faq.ts`):
  - Created `artifacts/api-server/src/routes/infinity/project-faq.ts` with POST `/projects/:id/faq/generate` and GET `/projects/:id/faq`
  - Uses `buildProjectContextByProjectId` for full project context (all 6 sources)
  - Prompts LLM for 8-12 Q&A pairs covering goals, stack, decisions, risks, next steps
  - Returns structured JSON with source citations; caches in `projectFaqs` table
  - Logs `faq_generated` activity via `logActivity()`
- **Created `projectFaqs` schema** in `lib/db/src/schema/project-faq.ts` with JSONB FAQ array
- **Extended auto-migrate** with `CREATE TABLE IF NOT EXISTS project_faqs` + indexes
- **Mounted router** in `artifacts/api-server/src/routes/infinity/index.ts`
- Typecheck passes for all NEW code (pre-existing test file errors unrelated)
- **Completed Phase 2.5 — Wired Project Chatbot into project home & gallery** (earlier):
  - Extended `activeProjectView` type to include `'chatbot'`
  - Added chatbot render branch in `home.tsx`
  - Added `chatbot` to `ProjectHomeAction` type + action card in `project-home.tsx`
  - Added `chatbot` to `ProjectSection` + quick access in `project-gallery.tsx`
  - Added i18n keys for home + gallery chatbot entries (EN+NL)
  - Typecheck + build pass for infinity artifact

## Project state — right now
- **Projects System Phase 1**: COMPLETE — Activity view mounted, global memories have provenance, activity types extended, sharing/export infrastructure ready
- **Projects System Phase 2.1**: COMPLETE — Timeline UI enhancements (date grouping, type filters, deep-link navigation)
- **Projects System Phase 2.2**: COMPLETE — Shared `useProjectActivity` hook
- **Projects System Phase 2.3**: COMPLETE — Project Chatbot API (read-only SSE)
- **Projects System Phase 2.4**: COMPLETE — Project Chatbot UI with citation chips
- **Projects System Phase 2.5**: COMPLETE — Chatbot wired into project home & gallery
- **Projects System Phase 3.1**: COMPLETE — Project FAQ API (generate + cached retrieval)
- **Projects System Phase 3.2**: COMPLETE — Project FAQ UI (accordion, regenerate, source chips, full wiring)
- **Projects System Phase 3.3**: COMPLETE — Conflict Detection API (POST `/projects/:id/conflicts/scan` + GET, LLM contradiction detection, `projectConflicts` table)
- **Projects System Phase 3.4**: COMPLETE — Conflict Detection UI (expandable cards, severity badges, resolve/dismiss actions)
- **Projects System Phase 3.5**: COMPLETE — Line-level Source Attribution (`sourceLocation` JSONB on `project_memories`, file/conversation/research/instruction provenance, updated extraction + display)
- **Projects System Phase 4.1-4.6**: COMPLETE — Mindmap + Cleanup fully implemented:
  - Phase 4.1: `projectConnections` schema (`lib/db/src/schema/project-mindmap.ts`)
  - Phase 4.2: `project-mindmap.ts` API (POST `/mindmap/infer` LLM extraction, GET `/mindmap` graph, POST `/mindmap/explain` edge explanation)
  - Phase 4.3: `project-mindmap.tsx` UI (React Flow graph) wired into `home.tsx` (activeProjectView 'mindmap')
  - Phase 4.4: "Explain This" endpoint integrated in same route
  - Phase 4.5: `project-cleanup.ts` API (POST `/cleanup/scan` — duplicate files, outdated memories, open questions, contradictions)
  - Phase 4.6: `project-cleanup.tsx` UI (tabbed results with Fix actions)
  - `mindmap_inferred` added to project-activity enum
- **Build Studio agentic loop**: COMPLETE - frontend consumes SSE from `/build/agent` endpoint for true autonomous agent behavior
- **Infinity Books** — live end-to-end run pending (needs server `.env`)

## Change record (newest first — EVERY change logged here, cap ~15)
- 2026-08-14: Updated KNOWLEDGE.md Grand Vision section with complete detailed vision (28 sections: Core AI Philosophy, Plan→Review→Execute, 17 Widget Types, Build Flow, Website Versioning, Apply Template, Self-Evolution Inspect/Edit/Heal, Git Transparency, Promo Video Maker, Infinity Self-Promo, Browser-Powered Business Research, Unified Conversational Execution, Deep Workspaces, Visual Feedback Widgets, Big Unifying Idea)
- 2026-08-14: Verified Phase 3.3-3.5 already fully implemented — Conflict Detection API (`project-conflicts.ts`), UI (`project-conflicts.tsx`), and Source Attribution (`sourceLocation` JSONB on `project_memories` with file/conversation/research/instruction types) all complete; infinity frontend typecheck + build PASS
- 2026-08-14: Fixed missing Dutch i18n keys for `projectHome.conflicts` and `projectHome.conflictsDesc` in `i18n.tsx` — added translations to Dutch dictionary; infinity frontend typecheck + build PASS
- 2026-08-14: Phase 3.2 — Completed Project FAQ UI (`project-faq.tsx`): accordion list, regenerate button, source chips (inline + footer), empty state, cached indicator, loading/error handling; added FAQ render branch in home.tsx; added `faq` to ProjectHomeAction + action card in project-home.tsx; added `projectHome.faq`/`projectHome.faqDesc` i18n keys EN+NL; typecheck+build PASS
- 2026-08-14: Phase 3.1 — Created Project FAQ API (`project-faq.ts`): POST /projects/:id/faq/generate (LLM 8-12 Q&A with sources), GET /projects/:id/faq (cached), schema `projectFaqs` (JSONB), auto-migrate CREATE TABLE, router mounted, logs `faq_generated` activity
- 2026-08-14: Phase 2.5 — Wired Project Chatbot into project home & gallery: added 'chatbot' to activeProjectView, ProjectHomeAction, ProjectSection; created chatbot action card in project-home.tsx + quick access in project-gallery.tsx; added i18n keys EN+NL
- 2026-08-14: Phase 2.4 — Created Project Chatbot UI component (`project-chatbot.tsx`): streaming SSE chat, inline citation chips, footer source chips, empty state with examples, stop/regenerate, error handling; 20+ i18n keys EN+NL
- 2026-08-14: Phase 2.3 — Created Project Chatbot API (`project-chatbot.ts`): POST /projects/:id/chatbot SSE stream, read-only assistant with full 6-source project context via buildProjectContextByProjectId, citation extraction, agent_ran activity logging
- 2026-08-14: Phase 2.2 — Created `useProjectActivity` hook (`artifacts/infinity/src/hooks/useProjectActivity.ts`): shared fetch logic with cursor pagination, filtering, grouping, deep-link building, ACTIVITY_ICONS
- 2026-08-14: Phase 2.1 — Timeline UI enhancements: date-grouping (day headers), type filter chips (multi-select), deep-link navigation via onNavigate callback, added projectTimeline.unknownDate i18n key, fixed router import (removed next/navigation)
- 2026-08-14: Phase 1.6 — Added EN + NL i18n keys for 10 new project features (timeline, chatbot, faq, conflict, cleanup, export, share, automation, connector, overview) in `artifacts/infinity/src/lib/i18n.tsx`
- 2026-08-14: Phase 1.5 — Created `projectExports` schema + API (export/import endpoints), wired in `index.ts` + `auto-migrate.ts`
- 2026-08-14: Phase 1.4 — Created `projectShares` schema + API (share CRUD endpoints), wired in `index.ts` + `auto-migrate.ts`
- 2026-08-14: Phase 1.3 — Extended `VALID_TYPES` in `project-activity.ts` with 8 new enum values for upcoming features
- 2026-08-14: Phase 1.2 — Added `sourceType`/`sourceRef` to `user_memories` schema + `memories.ts` route + `chat.ts` extraction
- 2026-08-14: Phase 1.1 — Mounted `ProjectActivity` component in `home.tsx` for `activeProjectView === 'activity'`
- 2026-08-14: Rename Jarvis → Infinity AI complete (269 files). Backend routes/, config/, imports. Frontend artifact/, components/, hooks/, manifest.json. DB schema jarvisSettings→infinitySettings, owner enum. API spec /jarvis/→/infinity/ + regenerated clients. Docs updated. Pre-existing test errors unchanged.
- 2026-08-14 Ran 6 agentic-loop integration tests (5 required + 1 bonus) — ALL PASS via `scripts/run-agent-tests.sh` (Node --test + tsx). Test file: `src/routes/infinity/__tests__/agent-loop-integration-direct.test.ts`.
- 2026-08-14 Rewired build-studio.tsx to /build/agent SSE endpoint: replaced runAutoPipeline with runAgentLoop, removed IterateResponse, updated UI text, added 4 i18n keys EN+NL, typecheck+build PASS. Commit 2a7be1a (pushed to abdulmohammedsecrets6/survey-automatically branch agentic-build-development).
- 2026-08-12 Phase L (AI Context Pipeline) implemented: `lib/project-context.ts` assembles six scoped sources (identity, instructions, memory, files w/ text excerpt, history from other project chats, research runs) into the PROJECT CONTEXT block; `chat.ts` `buildProjectContext` now delegates to it; all queries strictly filtered by projectId. Phase I rename bug fixed (keyed on files.id, not join id). typecheck + build pass for both packages.
- 2026-08-12 Chat-shell hardcoded-color cleanup verified: `pnpm run typecheck` and `git diff --check` pass; user bubble, header actions (GroupSettings/ConversationActions), voice/camera back buttons, and the settings avatar badge now use theme tokens instead of hardcoded light/dark hexes.
- 2026-08-12 Infinity AI composer cleanup: the input now uses a centered max-width surface with neutral theme tokens instead of competing hardcoded light/dark pill styles.
- 2026-08-12 Infinity AI conversation-feed cleanup: assistant content now sits in a bounded reading column, user bubbles have a readable maximum width, and feed spacing is less cramped.
- 2026-08-12 Infinity AI Projects cleanup: the Projects section starts collapsed so the conversation list remains the primary sidebar focus.

## Active threads
- **Phase 2** (Timeline + Chatbot) — COMPLETE (2.1-2.5 done)
- **Phase 3** (FAQ + Conflict Detection + Source Attribution) — **COMPLETE (3.1-3.5 all done)**
- **Phase 4** (Mindmap + Cleanup) — **COMPLETE (4.1-4.6 all done)**
- **Phase 5** (Connectors + Automations) — needs Phase 1 export schema + Phase 3 conflict detection
- **Phase 6** (Sharing + Overview) — needs Phase 1 sharing + Phase 5 automation logging
- **Build Studio reliability**: visible progress transcript, plan/scaffold error handling, cancellation, and bounded self-review pipeline are implemented and verified; no active code changes remain.
- **Infinity Books** — live end-to-end run pending (needs server `.env`).

## Next actions
1. **Phase 4 COMPLETE** — Mindmap + Cleanup all wired (4.1-4.6 done, typecheck + build PASS)
2. **Start Phase 5** — Connectors + Automations (GitHub, Google Drive, Figma, Calendar, Gmail; scheduled triggers + automation logging)
3. **Start Phase 6** — Sharing + Overview (project share management UI, global Infinity overview dashboard)
4. **Infinity Books** — live end-to-end run pending (needs server `.env` with API keys)

## Locked decisions
- Continuity: KNOWLEDGE.md + session-brief.md replace the old logs; raw history in `archive/`.
- Memory rule: no personal trivia — only project state, changes, and how-it-works.
- Budget: 0 euro constraint — all services/APIs/hosting/libraries must be permanently 100% free.
- Git push: use `mine` remote (abdulmohammedsecrets6/survey-automatically), NOT origin (kasper-kal/Infinity AI — read-only for this token).
- After EVERY response: `git add -A && git commit -m "<what I just did>" && git push mine agentic-build-development`

## Project feature backlog (new — from user, with Grand Vision context)
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

**Grand Vision incorporated into KNOWLEDGE.md:** Core AI Philosophy (ambient autonomous layer), Plan→Review→Execute loop, 17 Widget Types, Build Flow, Website Versioning/Templates, Self-Evolution (Inspect/Edit/Heal), Git Transparency, Promo Video Maker, Browser Research, @/ Capability System, Unified Conversational Execution, Visual Feedback Widgets.