# Google Stitch Prompt 2: Projects System

**Pages Covered:** 4 (Projects Home, Project Memory, Project Instructions, Project Activity)  
**Constraint:** Structural specification only — no visual/style direction. All text/labels from actual codebase.

---

## Page 1: Projects Home / Dashboard

### Layout Structure
- **Top Bar** (sticky, same height as HomeHeader)
  - Left: Back button (chevron-left) → returns to Chat Mode sidebar
  - Center: Project icon + name (editable on click), "Open in Chat" button (opens project-scoped conversation)
  - Right: "New Chat" (creates project conversation), "More" menu (Rename, Archive, Delete, Duplicate)
- **Main Content** (single column, max-w-3xl, centered, padded)
  - **Overview Cards Row** (4-column grid desktop, 2-col tablet, 1-col mobile)
    1. **Chats Card**: "���� Chats" + count, subtitle "Conversations in this project", action "View all"
    2. **Memories Card**: "��� Memories" + count, subtitle "Project facts & preferences", action "Manage"
    3. **Instructions Card**: "���� Instructions" + count, subtitle "Ordered rules for this project", action "Manage"
    4. **Files Card**: "���� Files" + count, subtitle "Uploaded project files", action "Browse"
    5. **Research Card** (5th column on wide): "���� Research" + count, subtitle "Background research jobs", action "View"
  - **Recent Conversations** (section)
    - Header: "Recent Conversations" + "View all" link
    - List: up to 5 conversations, each row = title + timestamp + message count + "Open" action
    - Empty: "No conversations in this project yet. Start one from the toolbar."
  - **Recent Activity** (section)
    - Header: "Recent Activity" + "View all" link → opens Project Activity page
    - List: up to 5 activity items (emoji icon + description + relative time)
    - Empty: "No activity yet."
  - **Quick Actions** (button group, 2-row grid)
    - "New Chat in Project" (primary)
    - "Add Memory" → opens Project Memory
    - "Add Instruction" → opens Project Instructions
    - "Upload File" → file picker
    - "Start Research" → opens Research Panel scoped to project
    - "Generate Book" → opens Book Studio scoped to project

### Key Interactive States
- Project name: click to edit inline (save on blur/Enter, cancel on Esc)
- Cards: hover elevation, click navigates to respective sub-page
- Conversation rows: click opens that conversation in project scope
- Activity items: click expands details (if any)
- Empty states: illustrative, with primary CTA button

### Actual Text/Labels
- Back button aria: "Back to chat"
- Title: project name (dynamic)
- Buttons: "Open in Chat", "New Chat", "Rename", "Archive", "Delete", "Duplicate"
- Cards: "���� Chats", "���� Memories", "���� Instructions", "���� Files", "���� Research"
- Card subtitles: "Conversations in this project", "Project facts & preferences", "Ordered rules for this project", "Uploaded project files", "Background research jobs"
- Card actions: "View all", "Manage", "Browse", "View"
- Sections: "Recent Conversations", "Recent Activity", "Quick Actions"
- Empty conversation: "No conversations in this project yet. Start one from the toolbar."
- Empty activity: "No activity yet."
- Quick actions: "New Chat in Project", "Add Memory", "Add Instruction", "Upload File", "Start Research", "Generate Book"

---

## Page 2: Project Memory

### Layout Structure
- **Top Bar** (sticky)
  - Left: Back button → Projects Home
  - Center: "Project Memory" title
  - Right: "Add Memory" primary button
- **Search Bar** (below top bar, full width)
  - Input: placeholder "Search memories…", filters in real-time across content, key, category
  - Clear button (x) when non-empty
- **Category Filter Tabs** (horizontal scroll, single select, "All" default)
  - Tabs: "All", "Fact", "Preference", "Goal", "Context", "Rule", "Insight", "Task", "Other"
  - Count badge per tab (total memories in category)
- **Memory List** (scrollable, flex-1)
  - **Empty State** (when no memories or filtered to zero):
    - Illustration + "No memories yet" + "Add your first memory" button
  - **Memory Cards** (grouped by category, category header with count)
    - Each card:
      - **Pin indicator** (pin icon, filled when pinned) — click toggles
      - **Content** (truncated to 3 lines, expand on click)
      - **Metadata row**: category badge (color-coded), source badge ("Manual" / "Extracted"), relative timestamp
      - **Actions** (hover/tap): Edit (pencil), Delete (trash), Copy (copy icon)
    - **Inline Edit Mode** (replaces card content):
      - Textarea (full content), category select, "Save" / "Cancel"
    - **Delete Confirmation** (toast/confirm): "Delete this memory?"
- **Pagination** (cursor-based, "Load more" button at bottom)
  - Shows "Load more (X remaining)" when more exist
  - Disabled when loading

### Key Interactive States
- Search: debounced 200ms, highlights matches
- Category tabs: filter client-side (already loaded) + server filter on load more
- Pin: optimistic update, syncs to server
- Edit: inline, validates non-empty, saves on blur/Enter
- Delete: confirmation toast, removes from list on success
- Load more: appends, updates remaining count

### Actual Text/Labels
- Title: "Project Memory"
- Back: "Back to project"
- Add button: "Add Memory"
- Search: "Search memories…"
- Categories: "All", "Fact", "Preference", "Goal", "Context", "Rule", "Insight", "Task", "Other"
- Source badges: "Manual", "Extracted"
- Actions: "Edit", "Delete", "Copy", "Save", "Cancel"
- Empty: "No memories yet", "Add your first memory"
- Confirmation: "Delete this memory?"
- Load more: "Load more ({count} remaining)"

---

## Page 3: Project Instructions

### Layout Structure
- **Top Bar** (sticky)
  - Left: Back button → Projects Home
  - Center: "Project Instructions" title
  - Right: "Add Instruction" primary button
- **Instruction List** (scrollable, flex-1, ordered)
  - **Empty State**:
    - Illustration + "No instructions yet" + "Instructions guide how Infinity AI behaves in this project" + "Add your first instruction" button
  - **Instruction Rows** (drag-reorderable, numbered 1..N)
    - **Drag Handle** (grip-vertical icon, leftmost) — drag to reorder
    - **Number Badge** (auto-updated on reorder)
    - **Content** (truncated, expand on click)
    - **Explicit Badge** (toggle switch, right side) — when on, instruction is "explicit" (always injected)
    - **Actions** (hover): Edit (pencil), Delete (trash)
    - **Inline Edit Mode**:
      - Textarea (full content), explicit checkbox, "Save" / "Cancel"
  - **Reorder Persistence**: On drop, optimistic reorder + server sync; toast "Order saved"
- **Legacy Notice** (bottom, muted, small)
  - "Project instructions are synced with the legacy instruction field for compatibility."

### Key Interactive States
- Drag reorder: native HTML5 drag-and-drop, visual placeholder, number badges animate
- Explicit toggle: immediate sync, badge color changes (primary when on)
- Edit: inline, validates non-empty
- Delete: confirmation, re-numbers remaining
- Add: opens inline editor at bottom (position N+1), pre-focused

### Actual Text/Labels
- Title: "Project Instructions"
- Back: "Back to project"
- Add: "Add Instruction"
- Empty: "No instructions yet", "Instructions guide how Infinity AI behaves in this project", "Add your first instruction"
- Placeholder: "Enter instruction…"
- Explicit label: "Explicit" (tooltip: "Always include in project context")
- Actions: "Edit", "Delete", "Save", "Cancel"
- Legacy notice: "Project instructions are synced with the legacy instruction field for compatibility."
- Toast: "Order saved"

---

## Page 4: Project Activity

### Layout Structure
- **Top Bar** (sticky)
  - Left: Back button → Projects Home
  - Center: "Project Activity" title
  - Right: Search input (placeholder "Filter activity…", debounced)
- **Activity Feed** (scrollable, flex-1, cursor-based pagination)
  - **Empty State**: "No activity recorded for this project."
  - **Activity Items** (reverse chronological, grouped by date)
    - **Date Group Header**: Relative date ("Today", "Yesterday", "Aug 12", etc.)
    - **Each Item** (horizontal layout):
      - **Emoji Icon** (large, per type):
        - ��� Chat: "New conversation started"
        - ��� Memory: "Memory added/updated"
        - ��� Instruction: "Instruction added/updated"
        - ��� File: "File uploaded"
        - ��� Research: "Research job completed"
        - �� Task: "Task created/completed"
        - ��� Project: "Project created/archived"
      - **Description** (localized, dynamic): e.g., "Created conversation 'API Design'", "Added memory: 'User prefers TypeScript'", "Uploaded file 'schema.sql'", "Research job 'Market Analysis' completed"
      - **Relative Timestamp** (right): "2m ago", "3h ago", "Yesterday", "Aug 10"
  - **Load More** (button at bottom, when more exist):
    - "Load more ({count} remaining)"
    - Spinner when loading
- **Infinite Scroll Trigger** (bottom sentinel): auto-loads next page when scrolled near bottom (optional enhancement)

### Key Interactive States
- Search: filters client-side across description text, preserves date grouping
- Date groups: collapse/expand on header click (optional)
- Load more: appends, maintains scroll position
- Empty search result: "No activity matches '{query}'."

### Actual Text/Labels
- Title: "Project Activity"
- Back: "Back to project"
- Search: "Filter activity…"
- Empty: "No activity recorded for this project."
- Empty search: "No activity matches '{query}'."
- Date groups: "Today", "Yesterday", "{Month} {Day}" (localized)
- Type descriptions (dynamic per record):
  - Chat: "New conversation started", "Conversation moved to project"
  - Memory: "Memory added", "Memory updated", "Memory deleted"
  - Instruction: "Instruction added", "Instruction updated", "Instruction deleted", "Instruction reordered"
  - File: "File uploaded", "File deleted", "File renamed"
  - Research: "Research job started", "Research job completed", "Research job failed"
  - Task: "Task created", "Task updated", "Task completed", "Task deleted"
  - Project: "Project created", "Project archived", "Project renamed", "Project deleted"
- Load more: "Load more ({count} remaining)"