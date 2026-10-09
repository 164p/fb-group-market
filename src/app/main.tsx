import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter: ใช้บน GitHub Pages ได้โดยไม่ต้องตั้ง rewrite */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
