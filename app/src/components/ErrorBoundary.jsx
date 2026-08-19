import React from 'react';

// Simple error boundary — shows a generic message (never leaks error details).
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log to console for dev; in production this goes to Sentry (see TRD §7).
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
          <div className="p-6 bg-white border border-line rounded-2xl text-center max-w-sm">
            <p className="text-sm font-semibold text-red-600">Something went wrong</p>
            <p className="text-xs text-ink-muted mt-1">Please retry. If it persists, contact support.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-3 h-10 px-4 text-sm font-medium bg-white border border-line rounded-full text-ink hover:bg-canvas-soft"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}