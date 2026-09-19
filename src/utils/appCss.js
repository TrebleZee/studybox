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
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .ticking { animation: blink 2s ease-in-out infinite; }
`;
