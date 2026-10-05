import { Component } from "react";
import { storedBackup } from "../store/appState.js";
import { downloadBackup } from "../utils/backup.js";

const button = (strong) => ({
  padding: "9px 14px",
  borderRadius: "8px",
  border: strong ? "none" : "1px solid #3a3f4b",
  background: strong ? "#2b303b" : "transparent",
  color: "#e8eaed",
  fontWeight: 700,
  fontSize: "13px",
  cursor: "pointer",
});

// Catches a render error anywhere in the app. The fallback can't rely on the
// app's state or theme (that may be what broke), so its backup is built
// straight from storage and its colours are fixed.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("StudyBox: render failed", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const reload = this.props.reload ?? (() => window.location.reload());
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          background: "#14161b",
          color: "#e8eaed",
          fontFamily: '"Inter", system-ui, sans-serif',
        }}
      >
        <div role="alert" style={{ maxWidth: "420px", textAlign: "center", lineHeight: 1.6 }}>
          <p style={{ fontSize: "15px", marginBottom: "16px" }}>
            Something went wrong and StudyBox couldn&apos;t show this screen. Your data is still saved in this
            browser.
          </p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => downloadBackup(storedBackup())} style={button(true)}>
              Download backup
            </button>
            <button type="button" onClick={reload} style={button(false)}>
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
