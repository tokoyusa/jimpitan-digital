
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Critical Render Error:", error);
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: sans-serif;">
        <h1 style="color: #1d4ed8;">Jimpitan Digital</h1>
        <p style="color: #64748b;">Terjadi kesalahan saat memuat aplikasi.</p>
        <button onclick="window.location.reload()" style="background: #1d4ed8; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
          Muat Ulang Halaman
        </button>
      </div>
    `;
  }
};

// Pastikan DOM siap sebelum render
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
