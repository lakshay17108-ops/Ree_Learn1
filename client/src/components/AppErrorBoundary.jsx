import React from 'react';
import { ServiceUnavailable } from '../pages/ServiceUnavailable';

export class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application rendering failed', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ServiceUnavailable
          onRetry={() => window.location.reload()}
          onHome={() => window.location.assign('/')}
        />
      );
    }
    return this.props.children;
  }
}
