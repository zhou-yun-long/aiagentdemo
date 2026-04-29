import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import ProjectsPage from './pages/ProjectsPage';
import ShareView from './pages/ShareView';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/share/:shareToken" element={<ShareView />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
