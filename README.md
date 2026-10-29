# J&T Express — System Tutorial

A single-page, Firebase-backed knowledge base for the internal shipping system: sections → questions → answers (paragraph or numbered steps), annotated screenshots in a zoomable viewer, global Arabic/English search, and a section menu that follows your scroll position.

Stack: React 19 + TypeScript + Vite, Firestore (read-only, via `firebase/firestore/lite`), Firebase Storage for images.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Firebase web-app config
npm run dev
```

`npm run build` type-checks and outputs `dist/`, which `firebase deploy` can host (see `firebase.json`).

### Trying it locally without a Firebase project

The repo has sample content (`seed/`) and a script that loads it into the local emulators. You need Java 11+.

```bash
# .env.local
VITE_FIREBASE_PROJECT_ID=demo-jt-tutorial
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_APP_ID=demo-app
VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

```bash
npm run emulators        # terminal 1: Firestore :8080, Storage :9199
npm run seed:emulator    # terminal 2: loads seed/sample-data.json + seed/images
npm run dev
```

The sample content is placeholder text, not the real procedures.

## Firestore data model

I chose **two top-level collections** rather than a `questions` subcollection under each section. That way the whole tutorial loads with exactly two queries (instead of one per section), search works over everything in memory, and moving a question to another section only means changing its `sectionId`.

```
sections/{sectionId}
  title: string            // shown in the menu and as the section heading
  order: number            // display order (ascending)

questions/{questionId}
  sectionId: string        // id of the parent section document
  title: string            // the question / problem
  order: number            // display order within its section
  answerType: "paragraph" | "steps"
  answerText: string       // paragraph body, or an optional intro line for steps
  steps: string[]          // used when answerType == "steps"
  imageUrl?: string        // Firebase Storage download URL
  imageAlt?: string        // describes the screenshot (accessibility + viewer caption)
  imageWidth?: number      // intrinsic size, reserves space to avoid layout shift
  imageHeight?: number
```

Rules for the data:
- Documents without an `order` field are left out by Firestore's `orderBy`, so every section and question needs one.
- A question whose `sectionId` doesn't match a section is skipped (with a console warning). Sections with no questions are hidden.
- A `steps` answer with an empty `steps` array falls back to showing `answerText` as a paragraph.
- In paragraphs, a blank line (`\n\n`) starts a new paragraph.

**Images:** `imageUrl` can be any public image link. Options:
- **Vercel Blob (recommended):** upload from the command line and copy the printed URL:
  ```bash
  npm run upload-image -- ./screens/create-waybill.png ./screens/tracking.png
  ```
  One-time setup: Vercel dashboard → Storage → Create → Blob, then copy `BLOB_READ_WRITE_TOKEN` from the store's `.env.local` tab into your `.env.local`. The token has no `VITE_` prefix, so it is never bundled into the website. Files go to `tutorial-images/` with a random suffix, so re-uploading a file name never overwrites an older image.
- **Google Drive:** set the file to *Anyone with the link → Viewer*, then paste the share link as-is (`https://drive.google.com/file/d/<id>/view?usp=sharing`). The app rewrites Drive links into a direct image URL (`src/utils/imageUrl.ts`).
- **Firebase Storage:** upload under `tutorial-images/` and copy the download URL (needs the Blaze plan on new projects).

If you don't use Firebase Storage, deploy rules with `--only firestore:rules`.

**Adding content from the terminal:**

```bash
npm run content -- list                 # sections and questions with their IDs
npm run content -- add-section          # asks for ID, title, order
npm run content -- add-question         # asks for section, title, type, answer/steps, image, order
npm run content -- import content.json  # many at once (same shape as seed/sample-data.json)
```

The answer type is chosen when prompted: `1` = paragraph, `2` = steps. Images can be a local file (uploaded to Vercel Blob automatically) or a URL. In `import` files, use `imageFile` (path relative to the JSON file) or `imageUrl`. Items whose `id` already exists are replaced.

One-time setup: Firebase console → Project settings → Service accounts → Generate new private key. Save the JSON **outside the project folder** and put its full path in `.env.local` as `FIREBASE_SERVICE_ACCOUNT=`. The script uses the Admin SDK, which bypasses the security rules, so keep that key private.

**Security:** `firestore.rules` and `storage.rules` allow public reads and deny all writes. You manage content from the Firebase console, which isn't affected by these rules. Deploy them with `firebase deploy --only firestore:rules,storage`.

## Project structure

```
src/
├── components/
│   ├── SearchBar/           search input with a clear button (Esc also clears)
│   ├── SearchResults/       result list with highlighted matches and empty state
│   ├── SectionNavigation/   sidebar (≥960px) and horizontal chip bar (<960px)
│   ├── TutorialSection/     section heading + its accordion items
│   ├── QuestionAccordion/   accessible accordion item (button + region, inert when closed)
│   ├── AnswerContent/       paragraph or numbered-steps renderer
│   ├── ImageViewer/         full-screen zoom/pan dialog (portal)
│   ├── StatusMessage/       loading skeleton, error and empty states
│   └── Highlight/           <mark> rendering for search ranges
├── hooks/
│   ├── useTutorialData.ts   load state + retry
│   ├── useSearch.ts         in-memory index and ranking
│   ├── useActiveSection.ts  scroll tracking + programmatic navigation
│   ├── useStickyOffset.ts   measures the sticky header → --sticky-offset
│   └── useZoomPan.ts        viewer zoom, pinch and pan
├── services/
│   ├── firebase.ts          app init, env validation, emulator hookup
│   └── tutorialService.ts   Firestore reads + validation/normalisation
├── utils/                   text normalisation/highlighting, DOM ids, scroll helpers
├── types/tutorial.ts        shared types
└── constants/ui.ts          interface labels (Arabic); tutorial content is never hard-coded
```

## How the main behaviours work

**Search.** Search runs on every keystroke over section titles, question titles, answer paragraphs and each individual step. Text is folded before matching: case, Arabic letter variants (أ/إ/آ → ا, ى → ي, ة → ه, ؤ/ئ), diacritics (tashkeel) and tatweel, Arabic-Indic digits and runs of whitespace. Matches are then mapped back to positions in the original text so they can be highlighted. Every word in the query has to appear somewhere in the question. Questions whose title matches rank first. While a search is active, the results take the place of the content, but the content stays mounted (hidden), so open answers and loaded images are kept. Clearing the search brings back your previous scroll position. Choosing a result clears the search, opens that question, scrolls to it, focuses its header and briefly outlines it.

**Active section.** The active section is the last one whose top edge has passed a line 32px below the sticky header. Before the first section reaches that line, the first section is active. When the page is scrolled to the very bottom, the last section is active. An `IntersectionObserver` on a 1px band at that line fires only when a section edge crosses it, so updates are cheap and adjacent sections can't flicker. A separate passive scroll check handles the "scrolled to the bottom" case. When you pick a section from the menu or a search result, it's highlighted straight away and tracking pauses until the smooth scroll settles (`scrollend`, with an idle-timer fallback). Wheel, touch or key input during that scroll hands control back to tracking immediately. `scroll-margin-top` uses the measured header height, so headings never end up under the sticky header.

**Image viewer.** Zoom with the buttons, the mouse wheel, a pinch, a double-click or the `+`/`-`/`0` keys. Drag to pan when zoomed in; panning is limited to the image's edges. The image is shown at its original aspect ratio and fitted to the screen. Opening the viewer locks page scrolling without moving the page. Closing it (✕ or Esc) returns focus to the thumbnail, and the accordion stays as it was.

**RTL.** The page is `dir="rtl"` and the CSS uses logical properties. Content strings use `dir="auto"`, so English questions display left-to-right correctly inside the Arabic layout.
