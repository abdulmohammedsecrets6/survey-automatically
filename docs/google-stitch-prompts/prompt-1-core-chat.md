# Google Stitch Prompt 1: Core Chat Experience

**Pages Covered:** 5 (Chat Mode, Voice Mode, Camera Mode, Agent Mode, Command Palette)  
**Constraint:** Structural specification only — no visual/style direction. All text/labels from actual codebase.

---

## Page 1: Chat Mode (Default Route `/`)

### Layout Structure
- **Left Sidebar** (collapsible, ~280px desktop, full-screen drawer mobile)
  - **Header**: "Infinity AI" + group badge (if group chat) + "New Chat" button
  - **Search Conversations**: Input with placeholder "Search conversations…"
  - **Conversations List** (grouped by date)
    - Date group headers: "Today", "Yesterday", "Last 7 days", "Older"
    - Each conversation row: title (truncated), timestamp, hover actions (rename, archive, delete)
    - Empty state: "No conversations yet. Start a new chat."
  - **Projects Section** (collapsible, starts collapsed)
    - Section header: "Projects" + chevron toggle + "New Project" button
    - Quick-access rail: up to 4 pinned/recent project pills (icon + truncated name)
    - "View all" link → opens Project Gallery
    - Project list: each row shows icon, name, chat count, last opened, actions (open, rename, archive, delete, move chat)
    - Empty state: "No projects yet. Create your first project."
  - **Footer**: User avatar + name, "Settings" gear, "Command Palette" (���K hint)

- **Main Content Area**
  - **Top Toolbar** (HomeHeader)
    - Left: Sidebar toggle (hamburger), page title ("Chat" / conversation title), group settings (if group)
    - Right: "New Chat" primary button, Mode selector (Chat/Voice/Camera/Agent), mic button, camera button, Build shortcut (@Build)
  - **Timer Strip** (conditional, above feed)
    - Shows active timers: each as pill with label, remaining time, cancel button
  - **Conversation Feed** (flex-1, scrollable)
    - **Messages** (bottom-anchored, auto-scroll to bottom on new)
      - **User Message**: right-aligned bubble, timestamp, status (sending/sent/failed), retry action on failure
      - **Assistant Message**: left-aligned, markdown rendering, thinking block (collapsible "Thinking…" with raw content), widget artifacts (13 types), copy button, regenerate action
      - **System/Tool Messages**: centered, muted, small text
    - **Empty State**: Centered illustration + "Start a conversation" + suggested prompts grid (4 cards)
    - **Loading State**: Skeleton bubbles
  - **Mobile Widget Strip** (mobile only, fixed bottom above composer)
    - Horizontal scroll: quick-action icons (attach, photo, voice, camera, code, file, location, contact)
  - **Chat Composer** (fixed bottom)
    - **Left + Menu** (dropdown): "Create Gem", "Attach File", "Take Photo", "Record Audio", "Share Location", "Share Contact", "Code Snippet", "Timer", "Reminder", "Poll"
    - **Center Input**: Textarea, auto-grow (min 1 line, max 6), placeholder "Message Infinity AI…", `Enter` = send, `Shift+Enter` = newline
    - **Right Toggles** (icon buttons): "Deep Research" (flask), "Web Search" (globe), "Attachments" (paperclip), "Dictation" (mic)
    - **Primary Action**: Send button (arrow-right), disabled when empty, loading spinner when streaming

### Key Interactive States
- Sidebar: open/closed (persisted), mobile drawer overlay
- Conversation: loading, streaming, error (with retry), empty
- Composer: empty, typing, sending, streaming response, dictation active
- Timer strip: visible when ≥1 active timer, hidden otherwise
- Mobile widget strip: visible < 768px only

### Actual Text/Labels (from i18n keys)
- Sidebar: "New Chat", "Search conversations…", "Today", "Yesterday", "Last 7 days", "Older", "No conversations yet. Start a new chat.", "Projects", "New Project", "View all", "No projects yet. Create your first project."
- Header: "Chat", "Voice", "Camera", "Agent", "New Chat"
- Composer: "Message Infinity AI…", "Create Gem", "Attach File", "Take Photo", "Record Audio", "Share Location", "Share Contact", "Code Snippet", "Timer", "Reminder", "Poll", "Deep Research", "Web Search", "Attachments", "Dictation"
- Feed: "Thinking…", "Copy", "Regenerate", "Start a conversation"

---

## Page 2: Voice Mode

### Layout Structure
- **Full-Screen Container** (fixed inset-0, z-50)
  - **Background**: Animated gradient/blob mesh (implementation detail)
  - **Top Bar** (safe-area padded)
    - Left: Back button (chevron-left) → returns to Chat Mode
    - Center: "Voice Mode" title
    - Right: PiP toggle (picture-in-picture), Settings gear (opens Settings Panel)
  - **Center Stage** (flex-1, centered)
    - **Orb Component** (large, animated)
      - 6 States: `idle` (breathing), `listening` (pulsing rings), `thinking` (rotating), `speaking` (waveform reactive), `error` (red pulse), `permission` (mic icon with request)
      - State transitions smooth (framer-motion spring)
    - **Session Timer** (below orb): "00:00" format, counts up while active
    - **Status Text** (below timer): Dynamic per state — "Listening…", "Thinking…", "Speaking…", "Tap to start", "Microphone permission needed"
  - **Bottom Controls** (safe-area padded, fixed)
    - Primary: Large circular button (mic icon) — tap to toggle listening
    - Secondary (left): "End Session" (hang-up icon) — returns to Chat Mode
    - Secondary (right): "Transcript" (message-square icon) — opens conversation feed overlay with voice messages

### Key Interactive States
- Permission denied: Shows permission state orb + "Grant microphone access" button (opens browser settings)
- Listening: Orb animates, timer runs, status "Listening…"
- Processing: Orb thinking state, status "Thinking…"
- Speaking: Orb speaking state (waveform), status "Speaking…", user can interrupt by tapping
- PiP: Minimizes to floating orb + timer, persists across navigation

### Actual Text/Labels
- Title: "Voice Mode"
- Back button aria: "Back to chat"
- PiP toggle aria: "Picture in picture"
- Timer: "00:00" (dynamic)
- Status: "Tap to start", "Listening…", "Thinking…", "Speaking…", "Microphone permission needed", "Grant microphone access"
- Buttons: "End Session", "Transcript"

---

## Page 3: Camera Mode

### Layout Structure
- **Full-Screen Container** (fixed inset-0, z-50)
  - **Video Feed** (full bleed, object-fit: cover)
    - `video` element, `playsInline`, `autoPlay`, `muted`
    - Object detection overlay: bounding boxes with labels + confidence (rendered via canvas overlay)
  - **Top Bar** (safe-area padded, semi-transparent)
    - Left: Back button → Chat Mode
    - Center: "Camera Mode" title
    - Right: Torch toggle (flashlight icon), Flip camera (rotate-cw icon), Settings gear
  - **Bottom Controls** (safe-area padded, semi-transparent)
    - Left: "Gallery" (image icon) — opens device photo picker
    - Center: Large capture button (shutter icon) — photo capture / hold for video
    - Right: "Analyze" (sparkles icon) — sends current frame to vision model, opens result in chat

### Key Interactive States
- Permission denied: Full-screen overlay with "Camera access required" + "Open settings" button
- Photo captured: Brief flash animation, thumbnail preview bottom-left (tap to open gallery)
- Video recording: Red recording indicator + timer, capture button becomes stop
- Analysis in progress: Loading spinner on Analyze button, result opens Chat Mode with image + analysis

### Actual Text/Labels
- Title: "Camera Mode"
- Back button aria: "Back to chat"
- Torch toggle aria: "Toggle flashlight"
- Flip camera aria: "Switch camera"
- Buttons: "Gallery", "Analyze"
- Permission: "Camera access required", "Open settings"
- Recording: "Recording… 00:00"

---

## Page 4: Agent Mode

### Layout Structure
- **Identical Chrome to Chat Mode** (same sidebar, header, timer strip, composer)
- **Differences in Main Content**:
  - **Feed Header** (above conversation feed): "Agent Mode" badge + "Autonomous loop active" indicator (green pulse dot)
  - **System Prompt Display** (collapsible, top of feed): Shows current agent system prompt (read-only), "Edit" button opens inline editor
  - **Tool Use Visualization**: Assistant messages show tool calls as expandable blocks:
    - Tool name + icon, input params (JSON, syntax highlighted), output/result, duration
    - Failed tools: red border, error message, retry button
  - **Autonomous Loop Indicator** (bottom of feed, when running): "Agent step {n} running…" + "Stop agent" button
  - **Composer Placeholder**: "Task Infinity AI agent…" (vs "Message Infinity AI…")

### Key Interactive States
- Loop running: Feed shows live tool calls, "Stop agent" visible, composer disabled
- Loop stopped: Composer enabled, "Agent step {n} complete" toast
- Plan mode: Shows plan steps before execution, "Approve plan" / "Modify plan" actions

### Actual Text/Labels
- Badge: "Agent Mode"
- Indicator: "Autonomous loop active"
- System prompt header: "Agent System Prompt"
- Tool block: "Tool: {name}", "Input", "Output", "Duration: {ms}ms", "Error: {message}", "Retry"
- Loop: "Agent step {n} running…", "Stop agent", "Agent step {n} complete"
- Composer: "Task Infinity AI agent…"
- Plan mode: "Plan Ready", "Approve plan", "Modify plan"

---

## Page 5: Command Palette (���K)

### Layout Structure
- **Centered Modal** (max-w-2xl, ~60% viewport height, z-[70])
  - **Header**: "Command Palette" + "���K" hint + close (Esc / click backdrop)
  - **Search Input** (auto-focused): Placeholder "Type a command or search…", filters all sections in real-time
  - **Sections** (scrollable, grouped, keyboard navigable ↑/���, Enter to select)
    1. **Modes** (4 items)
       - "Chat Mode" → switches to Chat
       - "Voice Mode" → opens Voice Mode
       - "Camera Mode" → opens Camera Mode
       - "Agent Mode" → switches to Agent Mode
    2. **Actions** (8-10 items, dynamic)
       - "New Chat", "New Project", "Create Gem", "Open Settings", "Open Build Studio", "Open Research", "Open Book Studio", "Open Design Studio", "Open Music Studio", "Open Data Lab"
    3. **Conversations** (top 10 recent, filtered by search)
       - Each: conversation title + "����" icon + relative time
    4. **Projects** (top 5 recent, filtered by search)
       - Each: project name + "����" icon + chat count
    5. **Footer Toggles** (always visible at bottom)
       - "Voice Mode" (mic icon, toggle)
       - "Camera Mode" (camera icon, toggle)
       - "Build Studio" (hammer icon, toggle)
       - "Settings" (gear icon, toggle)

### Key Interactive States
- Empty search: Shows all sections, recent conversations/projects
- Filtered: Only matching items, sections hide if empty
- Keyboard: ↑/��� navigate, Enter activate, Esc close, ���K reopen
- Mobile: Full-screen drawer, same sections

### Actual Text/Labels
- Title: "Command Palette"
- Search placeholder: "Type a command or search…"
- Sections: "Modes", "Actions", "Conversations", "Projects"
- Mode items: "Chat Mode", "Voice Mode", "Camera Mode", "Agent Mode"
- Action items: "New Chat", "New Project", "Create Gem", "Open Settings", "Open Build Studio", "Open Research", "Open Book Studio", "Open Design Studio", "Open Music Studio", "Open Data Lab"
- Footer: "Voice Mode", "Camera Mode", "Build Studio", "Settings"
- Keyboard hint: "���K" (Mac), "Ctrl+K" (Win/Linux)