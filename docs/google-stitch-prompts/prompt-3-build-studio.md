# Google Stitch Prompt 3: Build Studio

**Pages Covered:** 1 (Build Studio — 13 tabs, autonomous agent workspace)  
**Constraint:** Structural specification only — no visual/style direction. All text/labels from actual codebase.

---

## Page: Build Studio

### Layout Structure
- **Top Bar** (sticky, full width)
  - Left: Back button → Chat Mode, "Build Studio" title
  - Center: **Tab Bar** (13 tabs, horizontal scroll on narrow, keyboard ←/→)
    1. **Plan** — Planning & task breakdown
    2. **Code** — Code editor (CodeMirror)
    3. **Preview** — Live preview (iframe)
    4. **Terminal** — Integrated terminal
    5. **Files** — File tree explorer
    6. **Console** — Browser console logs
    7. **Network** — Network requests
    8. **Elements** — DOM inspector
    9. **Sources** — Source debugger
    10. **Performance** — Performance profiler
    11. **Memory** — Memory heap snapshots
    12. **Application** — Storage, service workers
    13. **Settings** — Build Studio preferences
  - Right: **Agent Controls** (visible when agent running)
    - "Agent step {n} running…" + spinner
    - "Stop agent" button (destructive)
    - "AFK Mode" toggle (continues in background)
- **Main Panel** (flex-1, tab content area)
  - **Tab: Plan** (default)
    - **Plan Mode Toggle** (top-right of panel): "Plan Mode" switch
    - **When Plan Mode ON**:
      - **Wizard Steps** (vertical stepper, 3 steps):
        1. **Describe**: Textarea "What do you want to build?" + "Generate Plan" button
        2. **Review**: Generated plan as structured list (phases → steps), each editable, "Approve Plan" / "Modify Plan"
        3. **Scaffold**: "Scaffolding…" progress → "Plan Ready" toast
      - **Plan Output** (read-only when not in wizard): Rendered markdown plan with phases, steps, acceptance criteria
    - **When Plan Mode OFF**: Shows current approved plan summary + "Enter Plan Mode" button
  - **Tab: Code**
    - **Editor Toolbar** (top): File tabs (open files), language selector, format button, save (���S)
    - **CodeMirror Editor** (flex-1): Syntax highlighting, line numbers, minimap, bracket matching, autocomplete
    - **Status Bar** (bottom): Cursor position, encoding, line ending, LSP status
  - **Tab: Preview**
    - **URL Bar**: Editable URL (default `http://localhost:5173`), "Refresh" button, "Open in New Tab"
    - **Iframe** (flex-1, border): Sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    - **Screenshot Button** (bottom-right): "Capture Screenshot" → downloads PNG
    - **Busy Overlay**: "Loading preview…" spinner when navigating
  - **Tab: Terminal**
    - **Terminal Toolbar**: New tab (+), split (horizontal/vertical), kill, clear, font size ±
    - **Xterm.js Instance** (flex-1): Full PTY, themes synced with app theme
    - **Shell**: `bash` or `zsh` (user preference), cwd = project root
  - **Tab: Files**
    - **Toolbar**: New file, new folder, upload, refresh, search (filters tree)
    - **File Tree** (flex-1): Expand/collapse folders, click file → opens in Code tab, right-click context menu (rename, delete, duplicate, copy path, open in terminal)
    - **Empty State**: "No files in project. Create one from the toolbar."
  - **Tab: Console / Network / Elements / Sources / Performance / Memory / Application**
    - **Placeholder Panels**: "Connect to preview to inspect {tab}" + "Open Preview" button
    - When preview active: Embedded DevTools frontend (via Chrome DevTools Protocol) for each tab
  - **Tab: Settings**
    - **Sections** (card groups):
      - **General**: Auto-save (on/off), Format on save (on/off), Tab size (2/4), Word wrap
      - **Agent**: Max steps (number), Auto-approve plan (on/off), AFK default (on/off)
      - **Preview**: Auto-refresh (on/off), Port (number), HTTPS (on/off)
      - **Terminal**: Shell (bash/zsh/fish), Font size, Cursor blink
- **Bottom Progress Transcript** (collapsible, fixed height ~300px, portal-rendered)
  - **Header**: "Build Progress" + "Clear" + "Expand/Collapse" + "Close"
  - **Message List** (reverse chronological, auto-scroll bottom)
    - **Message Types** (each with icon + timestamp):
      - **User Request**: "You: {prompt}"
      - **Plan Created**: "��� Plan created ({phases} phases, {steps} steps)"
      - **Agent Step**: "��� Agent step {n}: {tool} — {description}"
      - **Tool Call**: "���� {tool}({params})" (expandable → input JSON, output JSON, duration)
      - **Observation**: "���� {result summary}"
      - **Verification**: "��� Verified: {claim}" / "��� Failed: {claim}"
      - **Error**: "��� Error: {message}" (red)
      - **Done**: "��� Build complete ({duration}s)"
    - **Expandable Details**: Click any message → shows full JSON payload, stack trace, timing
  - **Input** (when agent not running): "Continue building…" textarea + "Continue" button
  - **AFK Mode Banner** (when AFK on): "AFK mode active — agent continues in background" + "Disable AFK"

### Key Interactive States
- Tab switching: preserves scroll/state per tab, lazy-loads heavy tabs (Console, Network, etc.)
- Plan Mode: wizard locks other tabs until complete; "Modify Plan" returns to step 1
- Agent Running: Plan/Code/Preview tabs show live updates; "Stop agent" terminates SSE, shows "Build stopped" in transcript
- AFK Mode: Closing Build Studio keeps agent running; reopening shows live transcript
- Terminal: Multiple tabs, split panes, persist across tab switches
- Files: Drag-drop upload, inline rename, context menu
- Progress Transcript: Collapsed by default, expands on new message, persists across sessions

### Actual Text/Labels
- Title: "Build Studio"
- Tabs: "Plan", "Code", "Preview", "Terminal", "Files", "Console", "Network", "Elements", "Sources", "Performance", "Memory", "Application", "Settings"
- Plan Mode: "Plan Mode", "Describe", "Review", "Scaffold"
- Wizard: "What do you want to build?", "Generate Plan", "Approve Plan", "Modify Plan", "Scaffolding…", "Plan Ready"
- Agent: "Agent step {n} running…", "Stop agent", "AFK Mode"
- Code: "Format", "Save", "Line {n}, Col {n}", "UTF-8", "LF"
- Preview: "Open in New Tab", "Capture Screenshot", "Loading preview…"
- Terminal: "New Tab", "Split Right", "Split Down", "Kill", "Clear", "Font Size"
- Files: "New File", "New Folder", "Upload", "Refresh", "Search files…", "Rename", "Delete", "Duplicate", "Copy Path", "Open in Terminal"
- Settings sections: "General", "Agent", "Preview", "Terminal"
- Settings fields: "Auto-save", "Format on save", "Tab size", "Word wrap", "Max steps", "Auto-approve plan", "AFK default", "Auto-refresh", "Port", "HTTPS", "Shell", "Font size", "Cursor blink"
- Progress Transcript: "Build Progress", "Clear", "Expand", "Close", "You:", "Plan created", "Agent step", "Tool:", "Observation:", "Verified:", "Error:", "Build complete", "Continue building…", "Continue", "AFK mode active — agent continues in background", "Disable AFK"