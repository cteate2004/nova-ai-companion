import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return React.createElement('div', {
        style: { color: '#e0d0ff', padding: 40, fontFamily: 'system-ui', background: '#1a1a2e', minHeight: '100vh' }
      },
        React.createElement('h1', null, 'Nova encountered an error'),
        React.createElement('pre', { style: { color: '#ff8a8a', marginTop: 16, whiteSpace: 'pre-wrap' } }, this.state.error.toString()),
        React.createElement('button', {
          onClick: () => { localStorage.clear(); window.location.reload(); },
          style: { marginTop: 20, padding: '10px 20px', background: 'rgba(200,160,255,0.2)', color: '#e0d0ff', border: '1px solid rgba(200,160,255,0.3)', borderRadius: 8, cursor: 'pointer' }
        }, 'Clear Data & Reload')
      );
    }
    return this.props.children;
  }
}

console.log('[Nova] App starting...');

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
