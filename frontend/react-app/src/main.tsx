import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './webapp/webapp.css'
import { App } from './webapp/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
