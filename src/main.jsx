import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import { markUpdateReady, watchForUpdates } from './pwa/updateStore.js'
import { runMigrations } from './store/migrations.js'

// Before the app reads anything: bring stored data up to the current schema.
// A failed step must not blank the app; the normalizers still load the data.
try {
    runMigrations()
} catch (error) {
    console.error('StudyBox: storage migration failed', error)
}

const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
        markUpdateReady(() => updateSW(true))
    },
    onRegisteredSW(_swUrl, registration) {
        watchForUpdates(registration)
    },
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
