# Paperleaf

A handwritten-feel digital notebook that runs entirely in the browser. Notes and
preferences are stored in `localStorage` on the user's device — there is no
backend, no account and no database.

Built with **React 18 + Vite**. The production build is a folder of static
files, so it deploys to Vercel's free tier as-is.

## Features

- **Dashboard** — notes shown as paper cards in their own paper colour, ink and
  handwriting, with title, created / last-edited dates and a snippet. Search,
  rename and delete from the card.
- **Editor** — a full-screen sheet of paper that grows as you write.
- **Auto-save** — changes are saved silently ~0.4s after you stop typing, and
  immediately when you press **Back**, switch tabs, refresh or close the page.
- **Paper** — plain or ruled (with the red margin line), in Crisp White, Warm
  Cream, Yellow Legal Pad, Pastel Blue or Charcoal.
- **Pens** — Ink pen (bold, rich), Ballpen (crisp, thin), Pencil (soft
  graphite), in Classic Black, Royal Blue, Crimson Red, Forest Green or
  Graphite Grey. On charcoal paper the inks switch to lighter gel-pen shades so
  they stay readable.
- **Handwriting** — Caveat, Patrick Hand, Indie Flower, Shadows Into Light and
  Kalam (Google Fonts), plus eight fonts bundled in `public/fonts` (Runethia,
  Runiga, Autography, Brother Signature, Always in the Star, Rustic Roadway,
  Southern Beach, Stylish Handwriting Script). The app name uses Runethia. The ruled lines are re-aligned to each font's baseline.
- **Floating toolbar** — collapsible; starts collapsed on phones.
- **Writing pen** — while you type, the pen you chose (ink pen, ballpen or
  pencil, in your ink colour) follows the caret and scribbles each letter,
  then lifts off when you pause.
- **Lists and checkboxes** — numbered (1.), Roman (I.), lettered (a.), dot (•),
  arrow (→) and checkbox (☐) lists from the toolbar. Enter starts the next
  item, Enter on an empty item ends the list, pressing the same button again
  removes the markers, and clicking a checkbox ticks it.
- **Opening animation** — a fountain pen writes "Paperleaf" over a frosted view
  of your notes, then fades (about 2.7 seconds). Click, tap or press any key to
  skip. Both animations are turned off for people whose system is set to
  reduce motion.
- Each note remembers its own look; a new note starts with the look you used
  last.

## Run locally

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173 by default).

To test the production build:

```bash
npm run build
npm run preview
```

## Deploy to Vercel (free)

### Option A — from GitHub (recommended)

1. Create a new repository on GitHub and push this folder to it:

   ```bash
   git init
   git add .
   git commit -m "Paperleaf"
   git branch -M main
   git remote add origin https://github.com/<your-username>/paperleaf.git
   git push -u origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub and
   import the repository.
3. Vercel detects Vite automatically. Leave the defaults
   (Build command `npm run build`, Output directory `dist`) and click
   **Deploy**.

Every later `git push` redeploys automatically.

### Option B — from the command line

```bash
npm install -g vercel
vercel
```

Answer the prompts (the defaults are correct), then run `vercel --prod` to
publish to your production URL.

No environment variables or server settings are needed.

## Project structure

```
index.html              Page shell + Google Fonts
src/
  main.jsx              React entry
  App.jsx               State, routing (#/n/<id>), auto-save
  storage.js            localStorage read/write + validation
  constants.js          Paper colours, pens, inks, fonts
  utils.js              Date and word-count helpers
  styles.css            All styling
  components/
    Dashboard.jsx       Notes grid, search, rename/delete dialogs
    Editor.jsx          Paper sheet, title, writing area
    Toolbar.jsx         Floating, collapsible tools
    Dialog.jsx          Modal
    Icons.jsx           Inline SVG icons
```

## Customising

- **Add a paper colour, ink or font** — add an entry to the matching list in
  `src/constants.js`. For a new Google font, also add it to the `<link>` in
  `index.html`; for a font file, put it in `public/fonts` and add an
  `@font-face` rule to `src/fonts.css`.
- **Line spacing** — change `LINE_HEIGHT` in `src/constants.js` and `--lh` in
  `src/styles.css` together.

## Good to know

- Notes live in this browser on this device only. Clearing site data, or using
  a different browser or device, means the notes are not there. There is no
  sync or export yet.
- `localStorage` holds roughly 5 MB per site — enough for thousands of text
  notes. If it ever fills up, the editor shows "Couldn't save".
