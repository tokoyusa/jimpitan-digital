
const React = (window as any).React;
const ReactDOM = (window as any).ReactDOM;

import App from './App';

const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}
