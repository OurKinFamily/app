import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installApiErrorReporter } from './lib/apiErrors'

// Before React mounts. MeContext wraps window.fetch too and restores the
// previous one when its preview ends, so this has to be underneath it.
installApiErrorReporter()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
