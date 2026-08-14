# Google Stitch Prompt 4: Creative Studios Hub & Studios

**Pages Covered:** 5 (Studios Hub, Research Panel, Book Studio, Design Studio, Music Studio)  
**Constraint:** Structural specification only — no visual/style direction. All text/labels from actual codebase.

---

## Page 1: Studios Hub

### Layout Structure
- **Top Bar** (sticky)
  - Left: Back button → Chat Mode, "Studios" title
  - Right: "Command Palette" (���K) hint
- **Main Content** (centered, max-w-5xl, padded)
  - **Header Section**
    - "Studios" (large heading)
    - "Specialized workspaces for research, creation, and analysis" (subtitle)
  - **Studio Grid** (responsive grid: 1 col <640px, 2 col <1024px, 3 col <1280px, 4 col ≥1280px)
    - **Each Studio Card** (equal height, clickable → navigates to studio)
      - **Icon Container** (48x48, rounded-xl, studio-specific tint background)
        - Icon (lucide-react, 24x24, white)
      - **Content**
        - Studio Name (font-semibold, e.g., "Research", "Book Studio")
        - Tagline (text-sm, muted, e.g., "Deep research with citations")
        - Description (text-xs, muted, 2 lines max, e.g., "Multi-source web, academic, and news research with background jobs")
      - **Action** (bottom-right): "Open" button (primary, small)
  - **Studios Included** (10 cards, fixed order):
    1. **Research** — Icon: `Search`, Tint: `blue`, Tagline: "Deep research with citations", Description: "Multi-source web, academic, and news research with background jobs"
    2. **Book Studio** — Icon: `BookOpen`, Tint: `indigo`, Tagline: "AI-authored books, A5 PDF", Description: "3-step wizard: setup → chapter plan → background generation with PDF/TXT export"
    3. **Design Studio** — Icon: `PenTool`, Tint: `purple`, Tagline: "Canvas editor + AI generation", Description: "Layers, filters, text-to-image, templates, export PNG/SVG/JSON"
    4. **Music Studio** — Icon: `Music`, Tint: `pink`, Tagline: "Procedural composition", Description: "4 moods, prompt generation, history, JSON download"
    5. **Data Lab** — Icon: `BarChart3`, Tint: `green`, Tagline: "CSV analysis + charts", Description: "Upload data, view stats, chart, ask Infinity AI for insights"
    6. **Build Studio** — Icon: `Hammer`, Tint: `orange`, Tagline: "Autonomous agent builder", Description: "13-tab IDE with agent loop, plan mode, live preview"
    7. **Future Studio 1** — Icon: `Zap`, Tint: `cyan`, Tagline: "Coming soon", Description: "Automated workflows and integrations"
    8. **Future Studio 2** — Icon: `Brain`, Tint: `violet`, Tagline: "Coming soon", Description: "Custom model fine-tuning playground"
    9. **Future Studio 3** — Icon: `Globe`, Tint: `teal`, Tagline: "Coming soon", Description: "Multi-agent simulation environment"
    10. **Future Studio 4** — Icon: `Sparkles`, Tint: `amber`, Tagline: "Coming soon", Description: "Generative UI component library"
  - **Empty State** (if no studios): "No studios available."

### Key Interactive States
- Card hover: elevation + tint glow, "Open" button more prominent
- Card click: navigates to studio page
- Future studios: "Open" shows toast "Coming soon" (disabled state)
- Responsive: grid reflows, cards maintain aspect ratio

### Actual Text/Labels
- Title: "Studios"
- Subtitle: "Specialized workspaces for research, creation, and analysis"
- Studio names/tags/descriptions: as listed above
- Button: "Open"
- Toast: "Coming soon"

---

## Page 2: Research Panel

### Layout Structure
- **Top Bar** (sticky)
  - Left: Back button → Studios Hub / Chat Mode, "Research" title
  - Right: "New Research" primary button
- **Main Content** (two-column: 1/3 sidebar + 2/3 detail, stacked mobile)
  - **Left Sidebar** (Job Queue)
    - **Header**: "Research Jobs" + count badge
    - **Filter Tabs**: "All", "Queued", "Running", "Completed", "Failed" (with counts)
    - **Job List** (scrollable, each row):
      - Status indicator (dot: gray/blue/green/red)
      - Topic (truncated)
      - Depth badge: "Quick" / "Standard" / "Deep"
      - Mode badge: "Web" / "Academic" / "News"
      - Progress bar (when running): "45% — Extracting sources"
      - Relative time: "2m ago", "Running…"
      - Click → loads detail in right panel
    - **Empty State**: "No research jobs yet. Start your first investigation."
  - **Right Panel** (Job Detail / New Job Form)
    - **When No Selection / New Job**:
      - **Setup Form** (card, padded):
        - **Topic**: Textarea, placeholder "What do you want to research?", required, min 10 chars
        - **Depth**: Radio group (3 options)
          - "Quick" — "Fast overview, ~2 min"
          - "Standard" — "Balanced depth, ~5 min"
          - "Deep" — "Comprehensive, ~15 min"
        - **Mode**: Checkbox group (multi-select, at least 1)
          - "Web" (default)
          - "Academic"
          - "News"
        - **Project Scope** (optional): Project selector dropdown "All Projects" / specific project
        - **Actions**: "Cancel" + "Start Research" (primary, disabled until valid)
    - **When Job Selected**:
      - **Header**: Topic (editable on click), status badge, depth/mode badges, project badge (if scoped)
      - **Progress Section** (when running):
        - Circular progress + percentage
        - Current phase: "Planning" / "Searching" / "Extracting" / "Synthesizing" / "Finalizing"
        - Live log: timestamped entries (auto-scroll), e.g., "[12:34] Searching web for 'AI trends'…"
      - **Results Section** (when completed):
        - **Summary** (markdown rendered)
        - **Sources** (expandable list): title, URL, snippet, credibility score
        - **Citations** inline in summary (numbered, hover → source tooltip)
        - **Actions**: "Copy Summary", "Download Report" (markdown), "New Research"
      - **Error Section** (when failed):
        - Error message, "Retry" button, "New Research"
      - **Notes** (always visible at bottom): Textarea "Add notes…" auto-saves, persists per job

### Key Interactive States
- New job form: validates topic length, requires ≥1 mode, shows character count
- Running job: live progress updates via polling (2s interval), log streams
- Completed: markdown renders with syntax highlighting, citations link to sources
- Job list: auto-refreshes every 5s when any job running
- Notes: debounced save (1s), shows "Saved" indicator

### Actual Text/Labels
- Title: "Research"
- Back: "Back to studios"
- New button: "New Research"
- Sidebar: "Research Jobs", "All", "Queued", "Running", "Completed", "Failed"
- Job row: "Planning", "Searching", "Extracting", "Synthesizing", "Finalizing"
- Form: "What do you want to research?", "Quick", "Fast overview, ~2 min", "Standard", "Balanced depth, ~5 min", "Deep", "Comprehensive, ~15 min", "Web", "Academic", "News", "Project Scope", "All Projects"
- Actions: "Cancel", "Start Research", "Copy Summary", "Download Report", "New Research", "Retry"
- Progress: "Extracting sources", "Synthesizing findings"
- Notes: "Add notes…", "Saved"
- Empty: "No research jobs yet. Start your first investigation."

---

## Page 3: Book Studio

### Layout Structure
- **Top Bar** (sticky)
  - Left: Back button → Studios Hub, "Book Studio" title
  - Right: "My Books" link (navigates to book library/history)
- **Main Content** (centered, max-w-3xl, padded)
  - **Step Indicator** (top, 3 steps, shows current): "Setup" → "Plan" → "Generate"
  - **Wizard Panel** (card, animated transitions between steps)
    - **Step 1: Setup**
      - **Fields**:
        - Topic (text, required): "Book topic / working title"
        - Audience (select): "General", "Technical", "Academic", "Young Adult", "Children", "Business"
        - Tone (select): "Informative", "Conversational", "Authoritative", "Playful", "Persuasive", "Minimalist"
        - Length (select): "Short (~30 pages)", "Medium (~60 pages)", "Long (~100 pages)", "Epic (~200 pages)"
        - Language (select): "English", "Dutch" (matches i18n)
        - API Key (optional, password): "Bring your own OpenRouter key" (help text: "Uses server default if empty")
      - **Action**: "Continue to Plan" (primary, disabled until required fields valid)
    - **Step 2: Plan** (Chapter Outline)
      - **Header**: "Chapter Plan" + "Add Chapter" button
      - **Chapter List** (reorderable, numbered):
        - Each chapter: drag handle, number, title input, description textarea, "Remove" button
        - Min 3 chapters, max 20
        - "Generate with AI" button (fills outline based on setup)
      - **Actions**: "Back" (secondary) + "Approve & Generate" (primary, disabled if <3 chapters)
    - **Step 3: Generate** (Background Jobs)
      - **Job List** (one per chapter + final assembly):
        - Chapter title, status (queued/running/completed/failed), progress %, "View" (opens chapter content)
        - Overall progress bar at top: "Chapter 3 of 10 — Writing…"
      - **Chapter View** (when "View" clicked / auto on complete):
        - Markdown rendered content, word count, "Copy", "Regenerate Chapter"
      - **Final Actions** (when all complete):
        - "Download PDF" (A5, formatted), "Download TXT", "Open in Viewer"
        - "Push Notification" toggle (sends when ready if enabled)
        - "Start New Book"
  - **History Sidebar** (collapsible, right side on desktop, bottom on mobile)
    - "Previous Books" list: title, status, date, "Download" / "View"

### Key Interactive States
- Step transitions: slide animation, form data preserved
- Setup: validates topic non-empty, shows char count
- Plan: drag-reorder chapters, "Generate with AI" calls LLM, inline edit titles/descriptions
- Generate: jobs run sequentially (configurable parallelism), live progress, can cancel individual chapter
- PDF generation: shows "Preparing PDF…" then download starts
- History: persists across sessions, click loads that book's generate step

### Actual Text/Labels
- Title: "Book Studio"
- Back: "Back to studios"
- My Books: "My Books"
- Steps: "Setup", "Plan", "Generate"
- Setup fields: "Book topic / working title", "Audience", "Tone", "Length", "Language", "API Key (optional)"
- Audience options: "General", "Technical", "Academic", "Young Adult", "Children", "Business"
- Tone options: "Informative", "Conversational", "Authoritative", "Playful", "Persuasive", "Minimalist"
- Length options: "Short (~30 pages)", "Medium (~60 pages)", "Long (~100 pages)", "Epic (~200 pages)"
- Language options: "English", "Dutch"
- API key help: "Bring your own OpenRouter key"
- Actions: "Continue to Plan", "Add Chapter", "Generate with AI", "Back", "Approve & Generate"
- Plan: "Chapter Plan", "Chapter {n}", "Title", "Description", "Remove"
- Generate: "Chapter {n} of {total}", "Writing…", "Queued", "Completed", "Failed", "View", "Regenerate Chapter"
- Final: "Download PDF", "Download TXT", "Open in Viewer", "Push Notification", "Start New Book"
- History: "Previous Books", "Download", "View"

---

## Page 4: Design Studio

### Layout Structure
- **Top Bar** (sticky)
  - Left: Back button → Studios Hub, "Design Studio" title
  - Right: "Export" dropdown (PNG, SVG, JSON), "Templates" button, "New Canvas" button
- **Main Content** (three-panel: left toolbar, center canvas, right panels)
  - **Left Toolbar** (vertical, fixed width ~60px, icon buttons with tooltips)
    - Tools: Select (V), Rectangle (R), Ellipse (E), Frame (F), Pen (P), Text (T), Image (I), Hand (H), Zoom (Z)
    - Each: icon, tooltip, active state highlight
  - **Center Canvas** (flex-1, relative)
    - **Viewport** (infinite canvas, pan/zoom)
      - Grid background (toggleable)
      - Rulers (top/left, show cursor position)
      - **Layers** (z-order): each object = frame, shape, text, image, group
      - Selection: blue bounding box, resize handles, rotation handle
      - Multi-select: shift+click, marquee select
    - **Canvas Controls** (bottom-right, floating):
      - Zoom: "100%" dropdown (50%, 75%, 100%, 150%, 200%, Fit), +/- buttons
      - Grid toggle, Pixel snap toggle
  - **Right Panels** (tabbed, ~280px, collapsible)
    - **Tabs**: Layers, Properties, Assets, AI Generate
    - **Layers Panel**:
      - Tree view: page → frames → groups → objects
      - Each row: visibility (eye), lock, name (editable on dbl-click), type icon
      - Drag-reorder, right-click: duplicate, delete, group, ungroup, rename
      - "New Layer" button at bottom
    - **Properties Panel** (context-sensitive to selection):
      - **Frame/Shape**: X, Y, W, H, rotation, corner radius, fill (color picker), stroke (color/width/style), effects (shadow, blur)
      - **Text**: Font family, size, weight, line height, letter spacing, alignment, color, text content (textarea)
      - **Image**: Fit (fill/fit/crop/tile), brightness/contrast, replace button
      - **Group**: Combined bounds, opacity
    - **Assets Panel**:
      - Tabs: "Images", "Icons", "Components"
      - Upload area (drag-drop), grid of thumbnails, drag onto canvas
      - Search/filter by name, tag
    - **AI Generate Panel**:
      - **Mode Tabs**: "Text to Image", "Image to Image", "Edit Region"
      - **Text to Image**: Prompt textarea, aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4), style preset (Photorealistic, Illustration, Minimal, Abstract), "Generate" → 4 thumbnails, click to add to canvas
      - **Image to Image**: Source image (upload or select from canvas), strength slider (0-1), prompt, "Generate"
      - **Edit Region**: Mask brush (paint on canvas), prompt, "Generate" → inpaints
      - History: previous generations with prompts, "Reuse"

### Key Interactive States
- Tool selection: changes cursor, shows tool options in Properties
- Canvas pan: space+drag or hand tool, zoom: scroll+ctrl or zoom tool
- Selection: click object, shift+click multi, marquee drag
- Properties: live updates as drag/resize, color picker opens popover
- Layers: drag-reorder updates z-index, visibility/lock toggles
- AI Generate: shows loading skeletons, inserts at canvas center, adds to Layers
- Export: PNG (current viewport or full canvas), SVG (vector only), JSON (full scene graph)

### Actual Text/Labels
- Title: "Design Studio"
- Back: "Back to studios"
- Export: "Export", "PNG", "SVG", "JSON"
- Templates: "Templates"
- New Canvas: "New Canvas"
- Tools: "Select", "Rectangle", "Ellipse", "Frame", "Pen", "Text", "Image", "Hand", "Zoom"
- Canvas: "100%", "Fit", "Grid", "Snap"
- Layers: "Layers", "Visibility", "Lock", "New Layer", "Duplicate", "Delete", "Group", "Ungroup", "Rename"
- Properties: "X", "Y", "Width", "Height", "Rotation", "Corner Radius", "Fill", "Stroke", "Effects", "Shadow", "Blur", "Font", "Size", "Weight", "Line Height", "Letter Spacing", "Alignment", "Color", "Content", "Fit", "Brightness", "Contrast", "Replace", "Opacity"
- Assets: "Images", "Icons", "Components", "Upload", "Search assets…"
- AI: "Text to Image", "Image to Image", "Edit Region", "Prompt", "Aspect Ratio", "Style", "Strength", "Generate", "Photorealistic", "Illustration", "Minimal", "Abstract", "Mask", "Reuse"

---

## Page 5: Music Studio

### Layout Structure
- **Top Bar** (sticky)
  - Left: Back button → Studios Hub, "Music Studio" title
  - Right: "History" button, "Download JSON" (current composition), "New Composition"
- **Main Content** (two-column: left controls, right output, stacked mobile)
  - **Left Panel** (Composition Controls, ~400px max)
    - **Mood Selector** (prominent, 4 large cards, single select)
      - **Ambient** — Icon: `Cloud`, "Atmospheric, evolving textures"
      - **Lo-fi** — Icon: `Cassette`, "Chill beats, vinyl warmth"
      - **Cinematic** — Icon: `Film`, "Orchestral, emotional arcs"
      - **Electronic** — Icon: `Zap`, "Synth-driven, rhythmic"
    - **Parameters** (card, shown when mood selected)
      - BPM (slider 60-180, default per mood)
      - Key (select: C, C#, D, D#, E, F, F#, G, G#, A, A#, B + Major/Minor)
      - Duration (slider 30-600 seconds)
      - Complexity (slider 1-10: "Simple" to "Layered")
      - Seed (number input, optional: "Leave blank for random")
    - **Prompt Generation** (card)
      - Generated prompt (readonly textarea, updates live from parameters)
      - "Copy Prompt" button
      - "Generate with AI" button (primary) → calls LLM for detailed composition spec
    - **AI Composition Spec** (when generated, card)
      - Structured display: sections (intro/verse/chorus/bridge/outro), instruments, chord progression, melody notes, arrangement notes
      - "Apply to Composer" button
  - **Right Panel** (Playback & Output)
    - **Player** (top, fixed height)
      - Waveform visualization (canvas, shows structure)
      - Transport: Play/Pause, Stop, Rewind 10s, Forward 10s
      - Time: "0:00 / 3:45"
      - Volume slider
      - Loop toggle
    - **Track List** (when composition generated)
      - Each track: name, instrument, mute/solo, volume, pan, "Download Stem" (WAV)
      - Master track at bottom
    - **MIDI/JSON Preview** (collapsible)
      - Raw JSON of composition (syntax highlighted), copy button
    - **Actions** (bottom)
      - "Render Audio" (starts background render, shows progress)
      - "Download Full Mix" (WAV, enabled after render)
      - "Save to History"

- **History Panel** (slide-over from right, triggered by "History" button)
  - List: date, mood, BPM, key, duration, "Play", "Load", "Download JSON", "Delete"
  - Empty: "No compositions yet."

### Key Interactive States
- Mood selection: updates default parameters, changes player theme color
- Parameters: live update generated prompt, "Generate with AI" enabled when mood selected
- AI Generation: loading state, streams spec, "Apply" inserts into composer
- Playback: scrub on waveform click, keyboard shortcuts (space=play/pause, arrows=seek)
- Render: background job, progress bar, "Download Full Mix" enables on complete
- History: click "Load" populates controls, "Play" streams from stored render

### Actual Text/Labels
- Title: "Music Studio"
- Back: "Back to studios"
- History: "History"
- Download JSON: "Download JSON"
- New: "New Composition"
- Moods: "Ambient", "Atmospheric, evolving textures", "Lo-fi", "Chill beats, vinyl warmth", "Cinematic", "Orchestral, emotional arcs", "Electronic", "Synth-driven, rhythmic"
- Parameters: "BPM", "Key", "Duration", "Complexity", "Seed", "Simple", "Layered", "Leave blank for random"
- Prompt: "Generated Prompt", "Copy Prompt", "Generate with AI"
- Spec: "Sections", "Instruments", "Chord Progression", "Melody", "Arrangement", "Apply to Composer"
- Player: "Play", "Pause", "Stop", "Rewind", "Forward", "Loop", "Volume"
- Tracks: "Mute", "Solo", "Pan", "Download Stem", "Master"
- Actions: "Render Audio", "Download Full Mix", "Save to History"
- History list: "Play", "Load", "Download JSON", "Delete"
- Empty: "No compositions yet."