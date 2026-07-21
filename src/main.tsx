import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/nocturne.css';
import './styles/app.css';
import { App } from './ui/App';
import { initTheme } from './ui/theme';

initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
