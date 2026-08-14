# Google Stitch Prompt 5: Data Lab & Settings Panel

**Pages Covered:** 2 (Data Lab, Settings Panel)  
**Constraint:** Structural specification only — no visual/style direction. All text/labels from actual codebase.

---

## Page 1: Data Lab

### Layout Structure
- **Top Bar** (sticky, modal-style since opened from Studios Hub / command palette)
  - Left: "Data Lab" title + `BarChart3` icon
  - Right: Close button (X) — returns to previous page
- **Main Content** (centered modal, max-w-lg, max-h-[70vh], scrollable)
  - **State 1: No Data Loaded (Upload View)**
    - **Drop Zone** (large, centered, dashed border)
      - `Upload` icon (large)
      - "Drop CSV file here or click to browse"
      - "Supports .csv, .tsv, .txt — up to 5000 rows"
      - "Browse" button (primary, triggers hidden file input)
      - Hidden file input: `accept=".csv,.tsv,.txt"`
    - **Parsing State** (when file selected):
      - Spinner + "Parsing data…"
    - **Error State** (if parse fails):
      - "Failed to parse file. Please check format and try again."
  - **State 2: Data Loaded (Analysis View)**
    - **File Info Bar** (top, compact)
      - `Table2` icon + filename + "·" + column count + " cols" + "·" + row count + " rows"
    - **Numeric Column Pills** (horizontal scroll, single select)
      - Label: "Column"
      - Each numeric column as pill: name, active state highlighted (primary bg), click to select
      - If no numeric columns: "No numeric columns detected." (amber warning)
    - **Statistics Grid** (2x2 or 4-col, shown for active column)
      - Cards: Min, Max, Mean, Sum (each: label + formatted value, monospace)
    - **Chart Area** (when data available)
      - Label: "{column name} · Chart"
      - Bar chart (Recharts, responsive container, h-44)
      - X-axis: first text column (truncated to 18 chars)
      - Y-axis: active numeric column
      - Bars: 7-color palette, rounded top corners
      - Tooltip: shows exact value on hover
    - **Action Bar** (bottom, 2 buttons equal width)
      - "New File" (secondary, outline) — resets to upload view
      - "Ask Infinity AI" (primary, with `MessageSquare` icon) — closes modal, sends summary to chat

### Key Interactive States
- Drag-drop: highlights drop zone, accepts multiple files (uses first)
- File input: click "Browse" → opens picker, clears value after
- Parsing: shows spinner, disables interactions
- Column selection: instant chart/stats update, pill highlights
- Chart: responsive, tooltip follows cursor, truncates long labels
- "Ask Infinity AI": builds summary (file name, columns, row count, top 5 numeric stats, 15 sample rows), closes modal, triggers chat with analysis request

### Actual Text/Labels
- Title: "Data Lab"
- Close aria: "Close"
- Drop zone: "Drop CSV file here or click to browse", "Supports .csv, .tsv, .txt — up to 5000 rows", "Browse"
- Parsing: "Parsing data…"
- Error: "Failed to parse file. Please check format and try again."
- File info: "{filename} · {N} cols · {M} rows"
- Column label: "Column"
- No numeric: "No numeric columns detected."
- Stats: "Min", "Max", "Mean", "Sum"
- Chart label: "{column} · Chart"
- Actions: "New File", "Ask Infinity AI"

---

## Page 2: Settings Panel

### Layout Structure
- **Top Bar** (sticky)
  - Left: Back button → Chat Mode, "Settings" title
  - Right: Version badge (e.g., "v2.4.1"), "Command Palette" (���K) hint
- **Main Content** (two-column: left nav ~240px, right panel flex-1, stacked mobile)
  - **Left Navigation** (vertical list, 10 items, active highlighted)
    1. **Home** — `Home` icon — "Overview & quick actions"
    2. **Personalization** — `Paintbrush` icon — "Theme, density, accent color"
    3. **Memory** — `Brain` icon — "Global memories & extraction"
    4. **Language** — `Languages` icon — "English / Nederlands"
    5. **Gmail** — `Mail` icon — "Connect, sync, labels"
    6. **Spotify** — `Music` icon — "Connect, playlists, playback"
    7. **App** — `Settings` icon — "Notifications, shortcuts, startup"
    8. **LLM** — `Cpu` icon — "Provider, model, temperature, keys"
    9. **About** — `Info` icon — "Version, license, links"
    10. **Accent** — `Palette` icon — "Custom accent color picker"
  - **Right Panel** (card, padded, scrollable)
    - **Tab: Home** (default)
      - **Quick Stats** (3 cards): "Conversations", "Projects", "Memories" (counts)
      - **Quick Actions** (button grid): "New Chat", "New Project", "Open Build Studio", "Open Command Palette"
      - **Recent Activity** (5 items): type icon + description + time
    - **Tab: Personalization**
      - **Theme**: Radio group — "Light", "Dark", "System" (default)
      - **Density**: Radio group — "Compact", "Comfortable" (default), "Spacious"
      - **Accent Color**: Color picker (shows current), "Reset to default"
      - **Preview**: Live preview box showing button, card, input with current settings
    - **Tab: Memory** (Global Memory Management)
      - **Header**: "Global Memories" + "Add Memory" button
      - **Search**: "Search memories…"
      - **Category Filter**: Same 8 categories as Project Memory (All, Fact, Preference, Goal, Context, Rule, Insight, Task, Other)
      - **Memory List** (same card structure as Project Memory):
        - Pin toggle, content (expandable), category badge, source badge (Manual/Extracted), timestamp
        - Inline edit, delete, copy actions
        - "Load more" pagination
      - **Extraction Settings** (bottom card):
        - "Auto-extract memories from chat" (toggle, default on)
        - "Extraction sensitivity" (slider: Low / Medium / High)
    - **Tab: Language**
      - **Language Selector**: Radio cards — "English (EN)" / "Nederlands (NL)"
      - **Preview**: Sample text in selected language ("Settings saved", "New conversation", etc.)
      - **Note**: "Requires app reload to fully apply"
    - **Tab: Gmail**
      - **Connection Status**: "Connected as {email}" + "Disconnect" / "Not connected" + "Connect Gmail" (OAuth button)
      - **Sync Settings** (when connected):
        - "Auto-sync" (toggle), "Sync frequency" (select: 5m, 15m, 30m, 1h, 6h, Manual)
        - "Labels to sync" (multi-select chips: INBOX, SENT, STARRED, custom)
        - "Last sync: {relative time}" + "Sync now" button
      - **Privacy Note**: "Emails are processed locally. Only metadata stored."
    - **Tab: Spotify**
      - **Connection Status**: "Connected as {display_name}" + "Disconnect" / "Not connected" + "Connect Spotify" (OAuth)
      - **Playback Control** (when connected):
        - Current track: artwork, title, artist, progress bar, transport (prev/play/pause/next)
        - Device selector: "Play on: {device name}"
      - **Playlists** (collapsible): "Your Playlists" + list (name, track count, "Play")
      - **Privacy Note**: "Playback controlled via Spotify Connect. No credentials stored."
    - **Tab: App**
      - **Notifications**: "Enable notifications" (toggle), "Permission status" (granted/denied + "Request permission")
      - **Shortcuts**: List of global shortcuts (���K Palette, �����M Voice, �����C Camera, �����B Build) — each editable (click to record new key)
      - **Startup**: "Open on startup" (toggle), "Default view" (select: Chat, Voice, Camera, Agent, Last used)
      - **Data**: "Export all data" (button), "Delete account" (destructive, confirmation modal)
    - **Tab: LLM**
      - **Provider**: Select — "OpenRouter" (default), "NVIDIA NIM", "Custom"
      - **Model**: Select (dynamic per provider) — shows model ID, context window, pricing tier
      - **Parameters**: Temperature (slider 0-2, default 0.7), Max tokens (number), Top-p (slider 0-1)
      - **API Keys** (card):
        - "OpenRouter Key" (password input, masked, "Test connection"), "NVIDIA NIM Key" (same)
        - Help: "Keys stored encrypted. Used for fallback."
      - **System Prompt**: Textarea (default Infinity AI prompt), "Reset to default"
    - **Tab: About**
      - **App Info**: "Infinity AI" + version + build date
      - **Links**: "GitHub Repository" (external), "Documentation" (external), "Report Issue" (external), "License" (modal: MIT)
      - **Credits**: "Built with React, Express, Drizzle, Tailwind, framer-motion, lucide-react, recharts, CodeMirror, xterm.js"
      - **Acknowledgments**: "Icons by Lucide. Charts by Recharts. Terminal by xterm.js."
    - **Tab: Accent**
      - **Color Picker** (large, hue+saturation+lightness)
      - **Preset Palette**: 12 preset colors (Infinity AI brand + semantic)
      - **Live Preview**: Same as Personalization preview
      - **Actions**: "Apply" (primary), "Reset to default"

### Key Interactive States
- Nav: click item → loads panel, active item highlighted, mobile: bottom sheet
- Personalization: live preview updates instantly, persists to localStorage + server
- Memory: same UX as Project Memory but global scope
- Language: radio select shows preview, "Apply" triggers reload
- Gmail/Spotify: OAuth flow opens popup, returns token, updates UI
- Shortcuts: click shortcut → "Press new key…" → captures, validates no conflict
- LLM: "Test connection" calls `/api/infinity/llm/test`, shows latency/result
- Accent: picker updates preview live, "Apply" writes to theme CSS vars

### Actual Text/Labels
- Title: "Settings"
- Back: "Back to chat"
- Nav items: "Home", "Personalization", "Memory", "Language", "Gmail", "Spotify", "App", "LLM", "About", "Accent"
- Nav descriptions: "Overview & quick actions", "Theme, density, accent color", "Global memories & extraction", "English / Nederlands", "Connect, sync, labels", "Connect, playlists, playback", "Notifications, shortcuts, startup", "Provider, model, temperature, keys", "Version, license, links", "Custom accent color picker"
- Home: "Conversations", "Projects", "Memories", "New Chat", "New Project", "Open Build Studio", "Open Command Palette"
- Personalization: "Theme", "Light", "Dark", "System", "Density", "Compact", "Comfortable", "Spacious", "Accent Color", "Reset to default"
- Memory: "Global Memories", "Add Memory", "Search memories…", "Auto-extract memories from chat", "Extraction sensitivity", "Low", "Medium", "High"
- Language: "English (EN)", "Nederlands (NL)", "Requires app reload to fully apply"
- Gmail: "Connected as", "Disconnect", "Not connected", "Connect Gmail", "Auto-sync", "Sync frequency", "Labels to sync", "Last sync", "Sync now", "Emails are processed locally. Only metadata stored."
- Spotify: "Connected as", "Disconnect", "Not connected", "Connect Spotify", "Play on", "Your Playlists", "Playback controlled via Spotify Connect. No credentials stored."
- App: "Enable notifications", "Permission status", "Request permission", "Shortcuts", "Press new key…", "Open on startup", "Default view", "Chat", "Voice", "Camera", "Agent", "Last used", "Export all data", "Delete account"
- LLM: "Provider", "OpenRouter", "NVIDIA NIM", "Custom", "Model", "Temperature", "Max tokens", "Top-p", "OpenRouter Key", "NVIDIA NIM Key", "Test connection", "Keys stored encrypted. Used for fallback.", "System Prompt", "Reset to default"
- About: "Infinity AI", "Version", "Build Date", "GitHub Repository", "Documentation", "Report Issue", "License", "Built with", "Icons by Lucide. Charts by Recharts. Terminal by xterm.js."
- Accent: "Apply", "Reset to default"