import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PictionaryWordGenerator from "./PictionaryWordGenerator.tsx"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PictionaryWordGenerator />
  </StrictMode>,
)
