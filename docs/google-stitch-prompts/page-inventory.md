# Infinity AI — Page Inventory for Google Stitch Prompts

**Generated:** 2026-08-14  
**Purpose:** Distinguish actual pages/routes from states/modals/overlays to ensure every distinct page is covered exactly once in Stitch prompts.

---

## �� Actual Pages (Distinct Routes / Top-Level Views)

These are the **17 distinct pages** that users navigate to as primary views. Each must appear in exactly one Stitch prompt.

| # | Page Name | Route / Entry Point | Description |
|---|-----------|---------------------|-------------|
| 1 | **Chat Mode** | `/` (default) | Main chat interface: sidebar (conversations + projects), conversation feed, composer with + menu, timer strip, mobile widget strip |
| 2 | **Voice Mode** | Via header mic button / command palette | Full-screen voice interface: animated orb (6 states), session timer, PiP toggle, microphone permission handling |
| 3 | **Camera Mode** | Via header camera button / command palette | Full-screen camera: live feed, object detection overlay, capture controls, torch/flip camera toggles |
| 4 | **Agent Mode** | Via mode selector / command palette | Agent chat variant: distinct system prompt, tool-use visualization, autonomous loop indicator |
| 5 | **Command Palette** | `���K` / header search | Global command palette: mode navigation, actions, conversation search, footer toggles (voice/camera/build/settings) |
| 6 | **Projects Home / Dashboard** | Sidebar project click → "Open" | Project dashboard: overview cards (chats, memories, instructions, files, research), recent conversations, recent activity, quick actions |
| 7 | **Project Memory** | Project Home → "Memory" tile | Scoped memory CRUD: 8 categories (Fact, Preference, Goal, Context, Rule, Insight, Task, Other), pinning, search, source tracking (manual/extracted), inline edit/delete |
| 8 | **Project Instructions** | Project Home → "Instructions" tile | Ordered instruction list: add/edit/delete, drag-reorder, explicit badge toggle, legacy compatibility notice, empty state |
| 9 | **Project Activity** | Project Home → "Activity" tile / Project Gallery → Activity | Activity feed: cursor-based pagination, search filter, load more, emoji icons per type (chat, memory, instruction, file, research, task, project), localized relative dates |
| 10 | **Build Studio** | Sidebar "Build" / command palette / `@Build` shortcut | 13-tab autonomous agent workspace: Plan/Code/Preview/Terminal/Files/Console/Network/Elements/Sources/Performance/Memory/Application/Settings; SSE progress transcript, plan mode, wizard, AFK mode |
| 11 | **Research Panel** | Sidebar "Research" / command palette | Background research: depth tiers (Quick/Standard/Deep), mode selection (web/academic/news), job queue with progress/logs/notes/heartbeat, resume-on-boot |
| 12 | **Book Studio** | Sidebar "Book Studio" / command palette / Studios Hub | 3-step wizard: Setup (topic, audience, tone, length, language) → Plan (chapter outline with add/remove/reorder) → Approve/Change → Background jobs with PDF/TXT download, push notification |
| 13 | **Design Studio** | Sidebar "Design Studio" / command palette / Studios Hub | Canvas editor: layers panel, filters/effects, AI generation (text-to-image, image-to-image), templates library, export (PNG/SVG/JSON), zoom/pan |
| 14 | **Music Studio** | Sidebar "Music Studio" / command palette / Studios Hub | Procedural composition: 4 moods (Ambient, Lo-fi, Cinematic, Electronic), prompt generation, history with playback, JSON download, BPM/key controls |
| 15 | **Data Lab** | Sidebar "Data Lab" / command palette / Studios Hub | CSV/TSV upload (drag-drop + browse), numeric stats grid (min/max/mean/sum), interactive bar chart (Recharts), column picker, "Ask Infinity AI" analysis handoff |
| 16 | **Studios Hub** | Sidebar "Studios" / command palette | Grid of 10 studio cards: each with icon, tint color, tagline, description, "Open" action; entry point to Research, Book, Design, Music, Data Lab, Build, plus future studios |
| 17 | **Settings Panel** | Header gear icon / command palette / sidebar footer | 10-tab settings: Home (overview), Personalization (theme, density, accent), Memory (global CRUD), Language (EN/NL), Gmail (connect/sync), Spotify (connect/playlists), App (notifications, shortcuts, startup), LLM (provider, model, temperature, keys), About (version, license, links), Accent (color picker) |

---

## ��� NOT Pages (States, Modals, Overlays, Components)

These are **UI states, modals, or components** that appear *within* pages above. They do **not** get their own Stitch prompt.

| Component | Where It Lives | Reason Excluded |
|-----------|----------------|-----------------|
| **Gem Dialog** | Chat Mode (via + menu → "Create Gem") | Modal dialog for creating custom AI personas |
| **Project Gallery** | Chat Mode sidebar (Projects section) | Sidebar section, not a full-page view |
| **Home Header** | Chat Mode, Voice Mode, Camera Mode, Agent Mode | Toolbar component (sidebar toggle, title, group settings, new chat) |
| **Chat Sidebar** | Chat Mode, Agent Mode | Persistent sidebar (conversations + projects) |
| **Conversation Feed** | Chat Mode, Agent Mode | Message list component within chat modes |
| **Chat Composer** | Chat Mode, Agent Mode | Input bar component within chat modes |
| **Timer Strip** | Chat Mode | Top strip showing active timers |
| **Mobile Widget Strip** | Chat Mode (mobile) | Bottom strip for quick actions on mobile |
| **App Overlays** | Global (all pages) | Centralized portal for toasts, confirmations, loading states |
| **Orb** | Voice Mode | Animated component within Voice Mode page |
| **Settings sub-views** (Personalization, Memory, Language, etc.) | Settings Panel | Tabs within the Settings page, not separate routes |
| **Build Studio tabs** (Plan, Code, Preview, etc.) | Build Studio | Tabs within the Build Studio page |
| **Book Studio wizard steps** (Setup, Plan, Jobs) | Book Studio | Steps within the Book Studio page |
| **Research job detail** | Research Panel | Expandable row within Research Panel |
| **Project quick-access rail** | Chat Sidebar | Compact project switcher in sidebar |

---

## ��� Grouping for Stitch Prompts (Max 5 Pages Per Prompt)

| Prompt | Pages Included | Count |
|--------|----------------|-------|
| **Prompt 1: Core Chat Experience** | Chat Mode, Voice Mode, Camera Mode, Agent Mode, Command Palette | 5 |
| **Prompt 2: Projects System** | Projects Home, Project Memory, Project Instructions, Project Activity | 4 |
| **Prompt 3: Build Studio** | Build Studio | 1 |
| **Prompt 4: Creative Studios Hub & Studios** | Studios Hub, Research Panel, Book Studio, Design Studio, Music Studio | 5 |
| **Prompt 5: Data Lab & Settings** | Data Lab, Settings Panel | 2 |

**Total:** 17 distinct pages across 5 prompts ��