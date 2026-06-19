# StudyBox Instructions

This file documents the app structure so future changes stay consistent.

## Core behavior

- StudyBox is a single-page React app with three views: `Planner`, `Log`, and `Settings`.
- The app stores everything in `localStorage`; there is no backend sync.
- The study timer must remain accurate in background tabs and standalone PWA mode.

## Storage keys

- `sb-subjects` - subject list, topic completion, and custom subjects
- `sb-sessions` - logged study sessions
- `sb-theme` - selected UI theme

## Data model

- Subjects include `id`, `name`, `exam`, `color`, `locked`, `custom`, and `topics`.
- Topics include `id`, `name`, and `done`.
- Sessions include `id`, `subjectId`, `subjectName`, `subjectColor`, `duration`, `date`, `note`, and `tags`.

## Customization rules

- Any subject can be edited or deleted from Settings, including the built-in defaults.
- Custom subjects can still be added from Settings.
- Theme changes should update the app surfaces and borders without changing subject colors.
- Session tags should be entered freely and also support quick suggestions such as `Past papers`, `Blurting`, and `Recap`.

## Editing guidance

- Keep the planner layout focused on subjects, topics, and the timer.
- Keep history entries compact, with tags shown as chips.
- Preserve the existing PWA support and local-only data model.
