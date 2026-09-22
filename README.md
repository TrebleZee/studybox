# StudyBox - v1.0.0

StudyBox is a lightweight study planner and revision timer built with React and Vite. It is designed to help you track topics, mark progress, time revision sessions, and keep a simple local history of your study work.

## What it does

- Organises revision by subject
- Lets you add, complete, and remove topics within each subject
- Supports custom subjects with your own name, exam board, and colour
- Lets you edit or delete the built-in subjects as well
- Lets you upload a subject specification PDF and auto-fill the subject name, exam board, and topic checklist
- Includes several theme presets so you can change the app's overall look
- Includes a built-in timer for focused study sessions
- Logs each session with duration, date, subject, tags, and an optional note
- Shows progress and time summaries per subject
- Works offline as a PWA once installed
- Can nudge you in the evening with a browser notification if today's streak is still unlogged

## Getting started

The first time you open StudyBox you choose how to begin:

- **Start blank** and add your own subjects and topics
- Pick a **starter template** you can freely edit or delete:
  - **A-Level example set** - Physics, Maths, Further Maths and Computer Science with sample A-level topics
  - **GCSE core subjects** - English, Maths and Combined Science with sample GCSE topics
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
- `src/utils/` - formatting, storage, subject normalisation, streak/XP logic, backup and themes
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
