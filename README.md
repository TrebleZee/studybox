# StudyBox - v1.12.1

StudyBox is a lightweight study planner and revision timer built with React and Vite. It is designed to help you track topics, mark progress, time revision sessions, and keep a simple local history of your study work.

## What it does

- Organises revision by subject
- Lets you add, complete, and remove topics within each subject
- Groups topics by exam paper with a progress bar per paper, for subjects from the catalogue; Foundation-tier GCSEs hide higher-tier-only topics (with a toggle to show them) and progress counts only your tier
- Supports custom subjects with your own name, colour, qualification (GCSE, A-level, AS or other), exam board (AQA, Edexcel, OCR, Eduqas, WJEC, CCEA or custom), optional spec code and, for GCSE, foundation or higher tier
- Labels each subject clearly, e.g. "OCR A-level Physics A" or "AQA GCSE Maths (Higher)"
- Lets you add subjects from the catalogue in Settings (**Add from catalogue**) as well as by hand or from a spec PDF
- Lets you edit or delete the built-in subjects as well
- Ships a built-in catalogue of real exam specifications (AQA, Pearson Edexcel and OCR), with each spec's topic headings, papers and set-text options, bundled with the app so it works offline. It covers GCSE Maths, English Language, English Literature and Combined Science (including AQA Synergy and both OCR suites) on AQA, Edexcel and OCR, and the most-taken A-levels - Maths, Further Maths, Psychology, Biology, Chemistry, Business, Physics, History, Sociology, Art and Design, Economics and Computer Science - on every board that offers them
- Lets you upload a subject specification PDF and auto-fill the subject name, exam board, spec code, qualification and topic checklist; if StudyBox recognises the spec code (e.g. AQA 8300, OCR H556, Edexcel 9MA0) it offers its own verified topic list instead of the one read from the PDF
  - The topic reader understands the layouts the boards use: numbered headings (`3.1.2 Memory`), labelled ones (`Topic 1 – Key concepts in biology`, `Unit Y101: …`, `Chapter B1: …`), history option codes (`1A The Age of the Crusades…`) and unnumbered headings above "What students need to learn". It skips admin sections, learning statements, maths notation appendices, page numbers and running footers, and picks the heading level that gives a usable checklist
  - Specs whose content isn't organised as headings (English set texts, Art and Design components, some maths specs laid out as tables) give few or no topics from the PDF; use the catalogue list, or add topics by hand
- Includes several theme presets so you can change the app's overall look
- Includes a built-in timer for focused study sessions
- Logs each session with duration, date, subject, tags, and an optional note
- Shows progress and time summaries per subject
- Works offline as a PWA once installed
- Can nudge you in the evening with a browser notification if today's streak is still unlogged
- Tracks milestones such as NEA deadlines, required practicals and spoken language endorsements, with due dates, overdue highlighting and a browser reminder three days before; catalogue specs come with their milestones, and an "NEA" topic can be turned into a milestone with one confirmed click
- Counts down to your next exam and shows, per subject, how many topics you have left, how many to cover each week and whether you're ahead, on track or behind; for subjects you sit in summer 2027, dates come from the boards' published timetables, and you can set your own exam year and dates for any paper

## Getting started

The first time you open StudyBox you choose how to begin:

- **Choose my subjects**: search the catalogue, pick your exam board, specification, tier and set texts or options for each subject (GCSE and A-level together), and get each spec's topics, papers and milestones
- **Start blank** and add your own subjects and topics
- Pick a **starter template** you can freely edit or delete:
  - **A-Level example set** - Physics, Maths, Further Maths and Computer Science with sample A-level topics
  - **GCSE core subjects** - AQA English Language, English Literature (starting with Macbeth, A Christmas Carol, An Inspector Calls and Power and Conflict), Maths and Combined Science: Trilogy, with each spec's topic list
- **Restore from file** if you already have a backup

## How it works

StudyBox has four main views:

- `Planner` for managing subjects, topics, and the timer (press Space to start or pause)
- `Log` for reviewing and editing session history and study-time totals
- `Analysis` for streaks, XP and time breakdowns
- `Settings` for themes, editing or deleting subjects, importing a subject spec PDF, backup and restore, and the optional Asana integration

The timer is based on timestamps rather than a simple interval counter, so it stays accurate even if the tab is backgrounded or the app is opened in standalone mode.

All data is stored locally in `localStorage`. Nothing is synced to a server. Use **Settings > Backup & Restore** to download a JSON backup, since browsers can clear site data.

Asana is an optional integration, off until you choose **Connect Asana** in Settings.

## Streak reminders

If you have a live streak and haven't logged a session by 8pm local time, StudyBox can show one browser notification reminding you, at most once a day. It's entirely client-side (no push server) and only fires while the app is open in some form - a tab, a backgrounded tab, or the installed PWA. Notification permission is requested at most once per visit, and only on a day the reminder could actually matter; if you deny it or your browser doesn't support notifications, the app stays silent about it and works exactly as before.

## Quick Start

- Go to [studybox-sigma.vercel.app](https://studybox-sigma.vercel.app) for a fully working version with no set up required
- Click the "Add Subject" button to add a new subject
- Click the "Add Topic" button to add a new topic to the subject
- Click the "Start Timer" button to start a new study session
- Study away!

## Development

### Requirements

- Node.js 18 or newer
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

### Spec catalogue

Spec files live in `src/data/specs/` (one `<board>-<spec>.json` per specification). `src/data/specs/index.json` is generated from them by `scripts/build-spec-index.js`, which runs automatically before `npm run build` and `npm test`, so don't edit it by hand.

To start a new spec file, run `npm run draft-spec -- <spec PDF path or URL> --board AQA --spec 8461 --qualification gcse --subject Biology`. It writes a draft to `drafts/` (not committed) that you then check against the PDF and finish by hand. See "Authoring specs" in `instruction.md`.

### Lint and test

```bash
npm run lint
npm test
```

## Install as an app

StudyBox includes PWA support through `vite-plugin-pwa`. On a supported browser, you can install it to the home screen or launch it in a standalone window.

## Tech stack

- React 19
- Vite
- `vite-plugin-pwa`

## Project structure

- `src/App.jsx` - app shell: state, persistence effects, handlers and the view switch
- `src/components/` - `PlannerView`, `LogView`, `SettingsView` (with `settings/` cards), `Onboarding`, `TopBar`, `AnalysisPanel`, `AsanaTasksPanel` and smaller pieces
- `src/hooks/useTimer.js` - timestamp-anchored study timer
- `src/utils/` - formatting, storage, subject normalisation, spec catalogue, streak/XP logic, backup and themes
- `src/utils/specImport.js`, `pdfLines.js`, `topicExtraction.js`, `specInference.js` - spec PDF import: text lines from pdf.js, the topic checklist, and board/spec code/qualification detection
- `src/data/specs/` - the spec catalogue (one JSON file per specification plus a generated search index)
- `src/data/exam-dates-2027.json` - published summer 2027 exam dates per spec and paper
- `scripts/` - dev scripts (`build-spec-index.js`, `draft-spec.js` with its pure parser in `scripts/lib/`)
- `src/services/asanaClient.js` - optional Asana API client
- `public/` - icons and favicon assets

## Data persistence

StudyBox saves:

- subject/topic progress
- logged study sessions
- theme selection
- imported subject definitions and custom subjects
- streak and XP progress
- whether first-run setup has been completed

Because storage is local to the browser, clearing site data will reset the app.
