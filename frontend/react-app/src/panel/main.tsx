import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PanelApp } from './PanelApp'
import './panel.css'

createRoot(document.getElementById('panel-root')!).render(
  <StrictMode>
    <PanelApp />
  </StrictMode>,
)
