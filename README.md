# StudyBox

StudyBox is a lightweight A-level study planner and revision timer built with React and Vite. It is designed to help you track topics, mark progress, time revision sessions, and keep a simple local history of your study work.

## What it does

- Organises revision by subject
- Lets you add, complete, and remove topics within each subject
- Supports custom subjects with your own name, exam board, and colour
- Lets you edit or delete the built-in subjects as well
- Includes several theme presets so you can change the app's overall look
- Includes a built-in timer for focused study sessions
- Logs each session with duration, date, subject, tags, and an optional note
- Shows progress and time summaries per subject
- Works offline as a PWA once installed

## Current subjects

The app starts with four subject areas:

- Physics
- Maths
- Further Maths
- Computer Science

You can add your own topics to each subject and mark them off as you revise.

## How it works

StudyBox has two main views:

- `Planner` for managing subjects, topics, and the timer
- `Log` for reviewing session history and study-time totals
- `Settings` for switching themes and adding/removing custom subjects
- `Settings` for switching themes and editing or deleting any subject

The timer is based on timestamps rather than a simple interval counter, so it stays accurate even if the tab is backgrounded or the app is opened in standalone mode.

All data is stored locally in `localStorage`. Nothing is synced to a server.

## Getting started

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

### Lint the code

```bash
npm run lint
```

## Install as an app

StudyBox includes PWA support through `vite-plugin-pwa`. On a supported browser, you can install it to the home screen or launch it in a standalone window.

## Tech stack

- React 19
- Vite
- `vite-plugin-pwa`

## Project structure

- `src/App.jsx` - main StudyBox UI and app state
- `src/main.jsx` - React entry point
- `public/` - icons and favicon assets

## Data persistence

StudyBox saves:

- subject/topic progress
- logged study sessions

Because storage is local to the browser, clearing site data will reset the app.
