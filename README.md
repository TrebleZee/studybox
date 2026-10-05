# StudyBox [![Latest release](https://img.shields.io/github/v/release/TrebleZee/studybox?label=version)](https://github.com/TrebleZee/studybox/releases/latest)

StudyBox is a lightweight study planner and revision timer built with React and Vite. It is designed to help you track topics, mark progress, time revision sessions, and keep a simple local history of your study work.

## What it does

- Organises revision by subject
- Lets you add, complete, and remove topics within each subject
- Groups topics by exam paper with a progress bar per paper, for subjects from the catalogue; Foundation-tier GCSEs hide higher-tier-only topics (with a toggle to show them) and progress counts only your tier
- Supports custom subjects with your own name, colour, qualification (GCSE, A-level, AS or other), exam board (AQA, Edexcel, OCR, Eduqas, WJEC, CCEA or custom), optional spec code and, for GCSE, foundation or higher tier
- Labels each subject clearly, e.g. "OCR A-level Physics A" or "AQA GCSE Maths (Higher)"
- Lets you add subjects from the catalogue in Settings (**Add from catalogue**) as well as by hand or from a spec PDF
- Lets you edit or delete the built-in subjects as well, and undo any delete (subject, topic, milestone or session) from the bar that appears after it
- Ships a built-in catalogue of real exam specifications (AQA, Pearson Edexcel and OCR), with each spec's topic headings, papers and set-text options, bundled with the app so it works offline. It covers GCSE Maths, English Language, English Literature and Combined Science (including AQA Synergy and both OCR suites) on AQA, Edexcel and OCR, and the most-taken A-levels - Maths, Further Maths, Psychology, Biology, Chemistry, Business, Physics, History, Sociology, Art and Design, Economics and Computer Science - on every board that offers them
- Lets you upload a subject specification PDF and auto-fill the subject name, exam board, spec code, qualification and topic checklist; if StudyBox recognises the spec code (e.g. AQA 8300, OCR H556, Edexcel 9MA0) it offers its own verified topic list instead of the one read from the PDF
  - The topic reader understands the layouts the boards use: numbered headings (`3.1.2 Memory`), labelled ones (`Topic 1 – Key concepts in biology`, `Unit Y101: …`, `Chapter B1: …`), history option codes (`1A The Age of the Crusades…`) and unnumbered headings above "What students need to learn". It skips admin sections, learning statements, maths notation appendices, page numbers and running footers, and picks the heading level that gives a usable checklist
  - Specs whose content isn't organised as headings (English set texts, Art and Design components, some maths specs laid out as tables) give few or no topics from the PDF; use the catalogue list, or add topics by hand
- Includes several theme presets so you can change the app's overall look
- Includes a built-in timer for focused study sessions, showing the selected topic (or Asana task) underneath
- Logs each session with duration, date, subject, tags, and an optional note
- Shows progress and time summaries per subject
- Works offline as a PWA once installed, and updates itself while open without interrupting a study session
- Shows the running version (e.g. `v1.17.1`) next to the StudyBox name on every screen
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

The timer is based on timestamps rather than a simple interval counter, so it stays accurate even if the tab is backgrounded or the app is opened in standalone mode. It is also saved locally, so a refresh or app update resumes the session.

The version shown next to the StudyBox name in the top bar is read from `package.json` at build time, so it always matches the release you're running.

All data is stored locally in `localStorage`. Nothing is synced to a server. If the browser's storage fills up, StudyBox keeps running, tells you your last change couldn't be saved and offers a backup download; if a screen ever fails to render, the fallback page offers the same download from what is saved. Use **Settings > Backup & Restore** to download a JSON backup, since browsers can clear site data. **Restore from file** replaces what's in the browser with the backup; **Merge from file** combines the two, keeping the most recent version of anything changed in both, which is how to bring two devices together. A merge can be undone with **Undo merge** until you import again or reload. Tabs on the same device need nothing: open StudyBox in two tabs, or the installed app beside a tab, and each picks up the other's changes as they happen without losing any (a running timer stays in the tab that started it).

Asana is an optional integration, off until you choose **Connect Asana** in Settings.

## Streak reminders

If you have a live streak and haven't logged a session by 8pm local time, StudyBox can show one browser notification reminding you, at most once a day. It's entirely client-side (no push server) and only fires while the app is open in some form - a tab, a backgrounded tab, or the installed PWA. Notification permission is requested at most once per visit, and only on a day the reminder could actually matter; if you deny it or your browser doesn't support notifications, the app stays silent about it and works exactly as before.

## Quick Start

- Go to [studybox-sigma.vercel.app](https://studybox-sigma.vercel.app) for a fully working version with no set up required
- Pick how to start (your exact specs, a template, or blank); more subjects can be added later from **Settings > Add Subject**, from the catalogue, by hand or from a spec PDF
- In the **Planner**, type a topic name and press **Add** to add it to the selected subject
- Press **Start** (or Space) to time a session, then **Log Session** to save it
- Study away!

## Development

### Requirements

- Node.js 20.19+ or 22.12+ (what Vite 8 requires; CI runs Node 22)
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

### Project status

`docs/STATUS.md` summarises recent changes, progress against the plan and anything waiting on the maintainer. It is updated with every PR.

### Lint and test

```bash
npm run lint
npm test
```

## Install as an app

StudyBox includes PWA support through `vite-plugin-pwa`. On a supported browser, you can install it to the home screen or launch it in a standalone window.

An open app checks for a new version every 15 minutes and whenever it comes back to the foreground. A new version installs itself (with a reload) as soon as no study session is in progress and the app is idle on the planner with nothing half-typed; otherwise (mid-session, in Settings or onboarding, or with an unsaved form) a banner offers **Update now** instead. The running timer, its topic, the session note and tags are saved locally, so a reload or refresh never loses a session. A timer left running in an app that was closed more than 12 hours ago comes back paused at the time it was last seen running, so a forgotten session isn't logged as days of study.

## Tech stack

- React 19
- Vite 8
- `vite-plugin-pwa`

## Project structure

- `src/main.jsx` - runs stored-data migrations, registers the service worker and mounts the app inside `ErrorBoundary`
- `src/App.jsx` - app shell: state, persistence effects, handlers and the view switch
- `src/components/` - `PlannerView`, `LogView`, `SettingsView` (with `settings/` cards), `Onboarding`, `TopBar`, `AnalysisPanel`, `AsanaTasksPanel`, `ErrorBoundary`, `UndoBar`, `SaveFailedBanner` and smaller pieces
- `src/hooks/useTimer.js` - timestamp-anchored study timer, saved across reloads
- `src/hooks/` also holds the reminders (`useStreakReminder`, `useMilestoneReminder`), undo (`useUndoDelete`), the failed-save banner state (`useSaveFailure`) and the Space shortcut (`useSpaceToggle`)
- `src/hooks/useAppUpdate.js` and `src/pwa/updateStore.js` - checks for new versions and applies them only when it's safe
- `src/store/` - the only code that touches `localStorage`: keys, scopes (account / device / secret), a change subscription, and how each key loads and merges changes from other tabs
- `src/utils/` - formatting, subject normalisation, spec catalogue, streak/XP logic, backup and themes
- `src/utils/specImport.js`, `pdfLines.js`, `topicExtraction.js`, `specInference.js` - spec PDF import: text lines from pdf.js, the topic checklist, and board/spec code/qualification detection
- `src/data/specs/` - the spec catalogue (one JSON file per specification plus a generated search index)
- `src/data/exam-dates-2027.json` - published summer 2027 exam dates per spec and paper
- `scripts/` - dev scripts (`build-spec-index.js`, `draft-spec.js` with its pure parser in `scripts/lib/`)
- `src/services/asanaClient.js` - optional Asana API client
- `public/` - icons and favicon assets
- `vercel.json` - security headers (Content-Security-Policy and friends) for the deployed app
- `docs/readiness/` - the V2 readiness findings ledger and dated reports; `docs/reviews/` - pre-merge review reports

## Data persistence

StudyBox saves:

- subject/topic progress
- logged study sessions
- theme selection
- imported subject definitions and custom subjects
- streak and XP progress
- whether first-run setup has been completed
- the current timer and the unlogged session's note, tags and topic
- what was deleted and when, so merging an older backup doesn't bring it back
- the day each reminder last fired, and the stored-data schema version

Because storage is local to the browser, clearing site data will reset the app.

The deployed app is served with a strict Content-Security-Policy (see `vercel.json`): it can only load code from its own origin and only talk to the network for the optional Asana integration (`https://app.asana.com`).
