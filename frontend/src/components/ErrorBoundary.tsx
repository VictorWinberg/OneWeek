import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="bg-[var(--color-bg-secondary)] p-8 rounded-2xl max-w-md text-center">
            <div className="text-4xl mb-4">😵</div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              Något gick fel
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-6">
              {this.state.error?.message || 'Ett oväntat fel inträffade'}
            </p>
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Försök igen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

