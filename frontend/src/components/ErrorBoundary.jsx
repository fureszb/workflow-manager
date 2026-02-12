import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary component to catch and handle React runtime errors
 * Prevents the entire app from crashing when a component throws an error
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    this.setState({ errorInfo });

    // Log to console for development debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <div
            className="max-w-md w-full rounded-lg border p-8 text-center"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#ef444420' }}
            >
              <AlertTriangle size={32} className="text-red-500" />
            </div>

            <h1
              className="text-xl font-bold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Hiba történt
            </h1>

            <p
              className="text-sm mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              Váratlan hiba történt az alkalmazásban. Kérjük, próbálja újratölteni az oldalt.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div
                className="mb-6 p-3 rounded text-left text-xs overflow-auto max-h-32"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                }}
              >
                <strong>Error:</strong> {this.state.error.toString()}
                {this.state.errorInfo && (
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
              >
                Újrapróbálás
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                }}
              >
                <RefreshCw size={16} />
                Oldal újratöltése
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
