import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import { markUpdateReady, watchForUpdates } from './pwa/updateStore.js'

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
