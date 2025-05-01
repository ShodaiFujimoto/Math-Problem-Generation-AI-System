import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Debug from './Debug.tsx'

// URLのパスに基づいて表示するコンポーネントを決定
const path = window.location.pathname;
const component = path === '/debug' ? <Debug /> : <App />;

// レンダリング
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {component}
  </StrictMode>,
)
