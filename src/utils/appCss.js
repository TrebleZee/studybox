export const buildCss = (C) => `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${C.bdr2}; border-radius: 3px; }
    input, textarea { font-family: inherit; font-size: 13px; }
    input::placeholder, textarea::placeholder { color: ${C.muted}; }
    .sub-btn:hover { background: ${C.hover} !important; }
    .topic-row:hover { background: ${C.s2} !important; }
    .topic-row:hover .del { opacity: 0.5 !important; }
    .del:hover { opacity: 1 !important; color: ${C.txt} !important; }
    .nb:hover { opacity: 0.85; }
    .nb:active { transform: scale(0.97); }
    .sess-row:hover .del-sess { opacity: 0.6 !important; }
    .sess-row:hover .edit-sess { opacity: 0.6 !important; }
    .edit-sess:hover { opacity: 1 !important; color: ${C.txt} !important; background: ${C.s3} !important; }
    .del-sess:hover { opacity: 1 !important; color: #f87171 !important; }
    .theme-card:hover { background: ${C.hover} !important; }
    .asana-row:hover { background: ${C.s2} !important; }
    .app-root { height: 100vh; height: 100dvh; }
    [data-pane-id] { min-width: 0; }
    [data-pane="subjects"] > :not([data-pane-id="subjects"]):not(.pane-switch),
    [data-pane="topics"] > :not([data-pane-id="topics"]):not(.pane-switch),
    [data-pane="timer"] > :not([data-pane-id="timer"]):not(.pane-switch) { display: none !important; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .ticking { animation: blink 2s ease-in-out infinite; }

    @media (max-width: 720px) {
      input, textarea, select { font-size: 16px !important; }
      button, select { min-height: 36px; }
      .topbar { height: auto !important; flex-wrap: wrap !important; padding: 6px 10px !important; row-gap: 4px !important; }
      .topbar-tabs { display: flex !important; order: 2; flex: 1 1 100%; gap: 4px; }
      .topbar-tabs > button { flex: 1 1 0; min-height: 40px; padding: 6px 4px !important; font-size: 13px !important; }
      .topbar-stats { order: 3; flex: 1 1 100% !important; margin-left: 0 !important; flex-wrap: wrap; justify-content: space-between; row-gap: 2px; }
      .topbar-stats button { min-height: 36px; }
      .pv { flex-direction: column !important; }
      .pv > [data-pane-id] { flex: 1 1 0 !important; width: auto !important; min-height: 0; border: none !important; }
      .pane-switch { display: flex; gap: 4px; padding: 6px 10px; flex: 0 0 auto; }
      .pane-switch > button { flex: 1 1 0; min-height: 40px; }
      .split { flex-direction: column !important; overflow-y: auto !important; }
      .split > * { flex: none !important; width: auto !important; overflow: visible !important; border-right: none !important; }
      .split > .split-side { border-bottom: 1px solid ${C.bdr} !important; }
      .theme-list { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
      .theme-list > button { margin-bottom: 0 !important; }
      .settings-grid { grid-template-columns: minmax(0, 1fr) !important; }
      .analysis-controls { flex-wrap: wrap; }
      .analysis-root { padding: 14px 12px !important; }
    }
`;
