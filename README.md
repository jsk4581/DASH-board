# DASH — Daily Agenda & Schedule Hub
<img width="2850" height="1362" alt="image" src="https://github.com/user-attachments/assets/a19532ea-e172-42b3-a7ee-6b801e39514e" />

**A **lightweight, simple** personal schedule dashboard**

Group your tasks into project boxes, then read all their deadlines at a glance on
the timeline below — as a **4‑week calendar** or a **2‑week Gantt chart**. 
It runs entirely in the browser with no backend; data is saved automatically and can be
exported to / imported from a JSON file.


## Features

- **Project boxes + to‑do lists** — a simple "box holds a list" structure (not a kanban board)
- **Three item states** — default · done (strikethrough) · highlight (bold + a hand‑drawn red "grading" circle)
- **Minimal‑click interactions** — hover an item and the complete / highlight / due‑date / delete buttons pop up right over it
- **Drag to reorder** — grab the handle to move boxes and items, including between lists
- **Timeline** — switch between a 4‑week calendar and a 2‑week Gantt chart; due dates and ranges show up automatically
- **Due dates & ranges** — a mini calendar where a click sets a single day and a drag sets a span
- **Undo / redo** — `Ctrl/⌘ + Z` and `Ctrl/⌘ + Y` (rapid edits are coalesced into one step)
- **Edit mode / View mode** — flip to a clean, read‑only view
- **Bilingual UI** — Korean ↔ English, remembered across visits
- **Autosave + export/import** — `localStorage` autosave, JSON backup you can move between devices
- **Responsive · mobile · dark mode** — works on any screen

## Tech stack

[Svelte 5](https://svelte.dev) + [Vite](https://vitejs.dev), with drag‑and‑drop by
[svelte-dnd-action](https://github.com/isaacHagoel/svelte-dnd-action). Runtime
dependencies are kept to a minimum, so the bundle stays small (~40 KB gzipped).

## Getting started

```bash
npm install
npm run dev      # http://127.0.0.1:5180
```

Production build:

```bash
npm run build    # outputs to dist/
npm run preview  # preview the built output
```

## Deployment

DASH is a fully static single‑page app, so any static host works. Pick one:

### GitHub Pages (recommended, zero‑config)

A workflow is included at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
One‑time setup:

1. In the repo, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`. The workflow builds with the correct base path and publishes automatically.

Your site goes live at `https://<user>.github.io/DASH-board/`.

The base path matters because Pages serves the project under `/DASH-board/`. The
build script sets it for you:

```bash
npm run build:pages   # = GITHUB_PAGES=1 vite build
```

> Forking under a different repo name? Update the path in
> [`vite.config.js`](vite.config.js) (`base`) to match `/<your-repo-name>/`.

### Other static hosts (Netlify · Vercel · Cloudflare Pages)

These serve from the domain root, so use the plain build (base `/`):

- **Build command:** `npm run build`
- **Publish / output directory:** `dist`

Add an SPA fallback if your host needs one (rewrite all paths to `/index.html`).

### Run it locally only

Don't want it public? Just `npm run build && npm run preview`, or serve `dist/`
with any static file server. Everything (including your data) stays on your machine.

## Data format

The JSON used by export / import:

```jsonc
{
  "meta": { "version": 1, "title": "DASH" },
  "projects": [
    {
      "id": "…",
      "title": "Project name",
      "color": "oklch(0.84 0.06 255)",   // any CSS color string
      "items": [
        {
          "id": "…",
          "text": "A task",
          "status": "default",            // "default" | "done" | "highlight"
          "start": "2026-06-21",          // range start, or null
          "due": "2026-06-25"             // due date, or null
        }
      ]
    }
  ]
}
```

UI preferences (mode, theme, timeline view, language) are stored separately and are
**not** included in exports.

## Keyboard & interaction

- **Add item** — the box's `+` or "Add item"; press `Enter` after typing to keep adding
- **Due date** — an item's calendar button → mini calendar: click (one day) / drag (range)
- **Drag** — grab the handle on a box header or the left of an item to move it
- **Save** — `Ctrl/⌘ + S` exports the board to a JSON file
- **Undo / redo** — `Ctrl/⌘ + Z` / `Ctrl/⌘ + Y` (also `Ctrl/⌘ + Shift + Z`)
- **Language** — the 🌐 button toggles Korean ↔ English

## License

MIT
