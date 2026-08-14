# KNOWLEDGE.md — Infinity AI Durable Knowledge

> Curated project memory. **Replaces** claude_changes_log.txt + .session_state.md + whats_next.md (archived in `archive/`).
> Read alongside **session-brief.md** (the living working state). **UPDATE on change — never append.**
> If a fact here is stale, edit it. If something durable happened, add it here (and note it in session-brief.md's recent conversation).

## Who & ground rules
- Owner: **Kasper Kal** (kasperkal1970@gmail.com). GitHub: kasper-kal/Infinity AI. Personal hobby project.
- Budget: **every thing, service, API, hosting, library = 0 euro, permanently free, no free trials.**
- Continuity: user wants every session to feel like one chat → **session-brief.md is the live state (updated every change)**; this file is the stable how-it-works reference.
- **Memory rule: never store personal trivia** (titles, how to address the user, small talk). Only project state, change record, and how-it-works. Trivia like "sir" dies with the session by design.
- User works in short, structured messages; dislikes stale/repetitive tracking noise.

## Repository map (reuse, don't rebuild)
- Monorepo: `artifacts/api-server` (Express, port 8080) · `artifacts/infinity` (React + Vite, port 5173) · `lib/db` (Drizzle package `@workspace/db`) · `Books/` (live style samples) · `scripts/` · `docs/` · `archive/` · `qa-report/`.
- Stack: Drizzle ORM + Postgres (Neon), Express routers under `/api/infinity/*`, React + Tailwind + framer-motion + lucide-react, i18n `en`/`nl` (type-enforced `nl: Record<keyof typeof en, string>`), Puppeteer (A5 PDFs, screenshots).
- DB schema: `lib/db/src/schema/` (one file per domain). Idempotent migrations: `lib/db/src/auto-migrate.ts` (`CREATE TABLE IF NOT EXISTS` + `ALTER ... ADD COLUMN IF NOT EXISTS`).
- LLM key pool lives in server `.env` (gitignored): OpenRouter first, NVIDIA NIM failover; plus Whisper, Flux, ElevenLabs, Tavily, Spotify, Google.

### Existing systems to reuse (detail/reuse map: docs/projects-system-plan.md §1)
- **Global memory** — `userMemories` (topic PK upsert) + `routes/infinity/memories.ts` (GET/PATCH/DELETE) + LLM auto-extraction in chat.ts (~L448, upserts not duplicates) + memory-block injection into system prompt (~L504).
- **Projects folder system** (base for the Projects upgrade) — schema `projects`/`projectChats`/`projectFiles`/`pins` in `lib/db/src/schema/projects.ts`; CRUD in `routes/infinity/projects.ts`; UI `components/project-gallery.tsx` rendered in `chat-sidebar.tsx`.
- **Background research jobs** — `researchJobs` schema + `routes/infinity/research.ts` (queued/running/completed, progress/phase/log/notes/heartbeat, resume-on-boot pattern).
- **Infinity Books** = the reference full feature end-to-end (schema + auto-migrate + routes + wizard UI + ~45 `book.*` i18n keys + background polling + push notification).
- **Build Studio** — @Build chat shortcut, theme-aware editor, CodeMirror, browser agent, and a visible portaled progress transcript for plan, questions, scaffold, preview, screenshot, self-review, cancellation, and terminal error states.
- **Infinity AI-the-app must not read internal working docs** — blocked in `artifacts/api-server/src/lib/source-code.ts` (KNOWLEDGE.md, session-brief.md, infinity config, .env, etc.).

## Active projects
> Live status (what's done/in-flight/next) always lives in **session-brief.md** — this section holds only permanent facts.
- **Infinity Books** — permanent facts: full A5-PDF book generator (idea → plan → approve/"change something" → 10-page LLM chunks → 2 critique passes → A5 PDF + book.txt), BYO API key, push notification, background job. Built + verified.
- **Projects System** — permanent facts: user's 32-step brief "persistent workspaces with isolated project memory"; full requirement capture (steps 1–20) + phases A–O in `docs/projects-system-plan.md`; Phases B–H are implemented and verified (project CRUD/search/sort/archive/open/pin, scoped conversation lifecycle/search, project home, isolated project memory CRUD/pinning/retrieval/extraction, bilingual Project Memory UI, ordered Project Instructions with chat injection, and first-class Projects navigation). Phase I (project files: upload/rename/delete/download/search + scoped `/api/infinity/projects/:id/files` endpoint) is implemented and verified. Phase L (AI Context Pipeline) is implemented: `lib/project-context.ts` assembles six scoped sources (identity, instructions, memory, files, history, research) into the PROJECT CONTEXT block — all queries strictly filtered by projectId for isolation.
- **12 New Project Features (Phases 1–6)** — user-requested additions on top of the base Projects System:
  1. **Project Timeline** — chronological git-commit-style view of all project activity; click event → jump to item
  2. **Project Chatbot (read-only)** — conversational assistant with read-only access to everything in project
  3. **AI-generated Project FAQ** — auto-generated Q&A like "What's the goal of this project?" from project context
  4. **Conflict Detection** — spot contradictions across sources (e.g., project memory says PostgreSQL but yesterday's chat says MongoDB)
  5. **"Explain This" on Mindmap** — click a connection → AI explains the relationship
  6. **Source Attribution** — every memory/fact shows exact provenance (conversation, file, line, timestamp)
  7. **Project Cleanup** — one-click scan for duplicate files, outdated memories, unresolved questions, contradictory decisions
  8. **Project Import/Export** — import from GitHub; export entire project as `.zip`
  9. **Project Sharing** — share a project with read-only or collaborator permissions
  10. **Automations** — scheduled triggers (e.g., "Every Monday 09:00 → summarize Calendar agenda → push notification")
  11. **Connectors** — GitHub, Google Drive, Figma, Canva, Google Calendar, Gmail, etc. (replacing ad-hoc Settings integrations)
  12. **Infinity Overview Menu** — global dashboard showing everything Infinity AI is doing right now
  - **Phase 1 (Foundation & Activity Integration) — COMPLETE**: Activity view mounted, global memories have provenance columns (`sourceType`/`sourceRef`), activity `VALID_TYPES` extended with 8 new enum values, `projectShares` schema+API (GET/POST/DELETE `/projects/:id/shares`), `projectExports` schema+API (POST/GET export, POST import), EN+NL i18n keys for all 10 feature areas added.
  - **Phase 2 (Timeline + Chatbot) — COMPLETE**: Timeline UI (date grouping, type filters, deep-link nav), `useProjectActivity` hook, read-only chatbot API+UI (SSE streaming, citations)
  - **Phase 3 (Intelligence)** — **3.1-3.2 COMPLETE**: FAQ generation API (`project-faq.ts`) with 8-12 Q&A pairs + source citations, cached retrieval. FAQ UI (`project-faq.tsx`) with accordion list, regenerate button, source chips, empty/cached/loading states. 3.3-3.5 pending.
  - **Phase 4 (Mindmap + Cleanup)** — connection graph inference, "Explain This" modal, cleanup scanner
  - **Phase 5 (Connectors + Automations)** — connector framework + sync jobs, automation scheduler + cron
  - **Phase 6 (Sharing + Overview)** — permission enforcement, public read-only view, system activity dashboard

## Decisions registry
- 2026-08-12 Infinity AI UI cleanup: the daily chat shell uses a restrained hierarchy with one toolbar action cluster, quieter grouped sidebar navigation, collapsed Projects by default, bounded conversation reading width, and a centered composer surface; every control surface uses the theme tokens — no hardcoded `bg-white dark:bg-[#...]` or hex bubble colors (user bubble = `bg-primary/10 dark:bg-primary/25`, toolbar/back buttons = `bg-card/80` + `border-border/50`). Deliberate brand colors stay (Studios hub per-studio tiles, Figma purple, Build Studio dark code surfaces).
- 2026-08-12 Build Studio reliability: build progress is shown in a live Infinity AI transcript rather than only a spinner/toast; plan acceptance closes plan mode before scaffolding, aborts are explicit cancellations, screenshot busy state is always released, and self-review is bounded.
- 2026-08-12 Projects System Phase H: the existing Infinity AI sidebar remains the global shell, while its Projects section provides scoped search/sort/archive/pin/rename/delete/create-from-chat/move actions and a compact project quick-access rail; unsupported project tools report honestly until their dedicated phases land.
- 2026-08-12 Projects System Phase G: `project_instructions` is the canonical ordered rule store, exposed through strict project-scoped CRUD/reorder APIs and a bilingual Infinity AI-native editor; mutations synchronize the legacy `projects.instructions` column, and project chat injects all rules with legacy fallback.
- 2026-08-12 Projects System Phase F: Project Memory is a dedicated Infinity AI-native view opened from the project home, with bilingual grouped CRUD/search/pin controls; it does not alter global chat navigation.
- 2026-08-12 Projects System Phase E: `project_memories` is keyed by `(projectId, canonical key)`; retrieval is zero-cost keyword scoring with all pinned memories plus up to twelve relevant rows; project chats extract only durable project facts and never read/write global user memory.
- 2026-08-12 Projects System Phase D: project chats are created transactionally, hidden from global conversation list/search, and receive project identity plus project instructions instead of global user-memory context; dedicated project-memory retrieval was completed in Phase E.
- 2026-08-12 Projects System Phase C: implemented the scoped project-home aggregate and Infinity AI-native dashboard, including project selection, back/continue/new-chat callbacks, and the useful empty state; preview remains stopped.
- 2026-08-12 Projects System Phase B: implemented backend project management and conversation move/remove APIs while leaving preview stopped; frontend wiring remains for later phases.
- 2026-08-11 Repo cleanup: stale docs → `archive/`; deleted orphaned WhatsApp session + junk (c4ea241, 97aed33); extended `.gitignore`.
- 2026-08-12 CLAUDE.md: removed AUTO-RESUME SYSTEM section + Chromebook note.
- 2026-08-12 Continuity redesign: replaced the 3 routine files with **KNOWLEDGE.md + session-brief.md**; raw history archived.

## Conventions that must not break
- **Commit + push after every response** (user requirement — see CLAUDE.md).
- Every UI string goes through `t()`, added to BOTH `en` + `nl`.
- Work is "done" only when both apps typecheck + server bundles (unless a quick fix).
- 0-euro budget everywhere, no free trials.

## Infinity AI — Grand Vision (user-provided, incorporated 2026-08-14)

### Core AI Philosophy
Infinity AI is the **central AI**, not a collection of separate apps. Most capabilities live **inside the main chat** (~70% of functionality). Separate workspaces exist only for things needing large interfaces (code editor, deep website editor). Infinity understands natural language and auto-selects capabilities. Users can explicitly select capabilities with **`@`** (like ChatGPT): `@Build Make a website`, `@Research ...`. `/` is for **actions/tools/shortcuts**: `/Search`, `/Create image`, `/Browse`, `/Generate video`. Visual widgets appear **directly in the conversation** showing "what Infinity is currently doing" — not forcing users into another app.

### Plan → Review → Execute (the universal loop)
For substantial actions:
1. **User**: "Build a website for my coffee shop."
2. **Infinity** asks for confirmation before beginning.
3. **Infinity plans**: produces an actual plan (create homepage, menu, location, contact, generate imagery, responsive, test).
4. **User gets two choices**: **Accept Plan** → execution begins, OR **Request Changes** → chat composer opens for edits ("Don't make menu separate, put on homepage + add online ordering"). Infinity updates plan. User iterates until satisfied.
Applies to many consequential actions, not just websites.

### 17 Widget Types (Build Studio component palette)
1. `Hero` — headline + subtext + CTA
2. `FeatureGrid` — 3-col cards with icons
3. `TestimonialCarousel` — auto-rotating quotes
4. `PricingTable` — tier comparison
5. `FAQAccordion` — collapsible Q&A
6. `StatsCounter` — animated numbers
7. `LogoCloud` — partner/tech logos
8. `CTABanner` — full-width conversion strip
9. `TeamGrid` — avatars + roles
10. `BlogPreview` — latest posts
11. `ContactForm` — validated + honeypot
12. `VideoEmbed` — YouTube/Vimeo/Loom
13. `ComparisonTable` — us vs them
14. `Timeline` — milestones
15. `InteractiveDemo` — sandbox/iframe
16. `NewsletterSignup` — email capture
17. `TrustBadges` — security/compliance
18. `Footer` — links + social + legal
19. `CustomCode` — escape hatch for arbitrary React

### Build Flow (Build Studio)
`@Build "landing page for X"` → **Planner** writes spec (widgets, copy, theme, responsive breakpoints) → **User approves/edits in chat** → **Scaffolder** writes Vite+React+Tailwind files to temp dir → **Preview Server** spins up (port 5173+) → **Puppeteer** screenshots (desktop/tablet/mobile) → **Self-Review Agent** critiques against spec (accessibility, contrast, copy fidelity, responsive behavior) → **Iterate** (max 3 rounds) → **User accepts** → **Export** (ZIP + deploy preview URL).

### Website Versioning
Persistent versions/revisions: Default → User changes → Revision 2 → Revision 3 → Revision 4... Historical revisions remain intact, immutable. Users can roll back (creates new revision, doesn't destroy history). Reliable foundation for templates and AI modifications.

### Apply Template
User clicks **Apply** on a template → Infinity creates **private copy** for that user. Original Template → User A copy, User B copy, User C copy. Changes to one copy never affect others. Changes to original template don't unexpectedly modify existing copies.

### Infinity's Self-Evolution (Inspect / Edit / Heal)
- **Inspect**: Infinity can **see its own code** (source, files, architecture, implementation) — it understands what makes Infinity work.
- **Edit**: Infinity can **propose changes to itself** (via Build Studio). **Every individual code change requires user approval** — no unrestricted self-modification.
- **Heal**: If Infinity gets an error → investigates → finds likely cause → proposes code change → user approves → applies → builds/tests → verifies fix. Potentially with rollback if change makes things worse.
- **Self-Evolution**: Broader concept — Infinity isn't just getting updates from user; it can **evolve its own capabilities** through controlled code changes. "The features are infinite" — capabilities aren't permanently limited to what was originally shipped.

### Git/Code-Change Transparency
For self-modification, visible process: "Infinity wants to make a change" → show files changed, lines added/removed, reason, proposed diff, tests, approval controls → **Reject / Review / Approve** → Build → Test → Verify → Commit/Rollback. Every AI action that mutates state creates a **signed commit** (author: `infinity-ai[bot]`). User sees full history in Timeline + Overview. "Revert this" = one click.

### Website Promo Video Maker (Major Feature)
User supplies: website URL + script/text. Backend launches Puppeteer/Playwright → visits website → captures high-res screenshots/video, navigates, simulates mouse movements/clicks/keyboard input → records exact interaction timeline (timestamps for mouse movements, clicks, keystrokes, navigation). Script → ElevenLabs → voice-over (neutral British female, commercial/polished). ASMR audio composition synchronized to interaction timeline: mechanical keyboard taps, crisp mouse clicks, UI sounds, transitions, Infinity-specific sounds (error sound: "pu-pum?" — a questioning little sound). Cursor animation visually shows animated cursor corresponding to captured mouse movement. Final automated MP4 rendering combines: website captures, cursor animation, interaction timeline, ElevenLabs voice, keyboard sounds, mouse clicks, other sound effects, transitions → returns `.mp4` to user.

### Infinity Promo Video (Self-Promo)
User types: **"Time to evolve..."** → black screen ~3 seconds → suddenly: **completely rebranded Infinity** with huge collection of new features appearing. Message: **"Infinity evolved."** Voice-over: neutral British female: **"The features are infinite."** Then: **"Infinite..."** with word echoing out. Ties directly into self-evolution concept.

### Browser-Powered Business Research
Infinity uses Puppeteer/Playwright to research user's real business: Memory ("Super Houses") → Search web → Find business website → Research public information → Find appropriate public/authorized assets → Adapt website. Goal: genuinely personalized, not generic. Respects image/content licensing.

### Unified Conversational Execution
One chat input does everything. No mode switching. "Summarize today's meetings and create tasks" → AI calls Calendar connector, summarizes, creates project tasks, logs activity. "Build a dashboard for these metrics" → @build triggers. "Export this project and email it to X" → @export + @gmail. User goes from: Build website → Actually change hero → Research competitors → Make promo video — without leaving main conversation. Infinity internally switches capabilities while user stays in same conversational environment.

### Deep Workspaces Still Exist
Not eliminating every specialized interface. Full code editing, full website editing, large document/book editing, advanced design work can still open dedicated workspaces. But **chat is the central control layer**.

### Visual Feedback Instead of Hidden Tool Calls
Infinity's work becomes visible through widgets/components. Not "I am using Puppeteer..." → user sees **browser widget**. Not raw build logs → **Build widget**. Not raw code modifications → **Diff/approval widget**. Not raw video rendering → **Promo widget**. Interface communicates **state of the task visually**.

### The Big Unifying Idea
**Infinity isn't a bunch of features. Infinity is an AI that can acquire and orchestrate capabilities.** That's why "the features are infinite" fits the product architecture, not just marketing copy.

---

## Active projects (updated)
- **12 New Project Features (Phases 1–6)** — detailed above with full vision context
- **Phase 2 (Timeline + Chatbot)** — COMPLETE
- **Phase 3 (Intelligence: FAQ + Conflict Detection + Source Attribution)** — **3.1-3.2 COMPLETE**, 3.3-3.5 ready to start
