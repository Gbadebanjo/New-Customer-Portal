'use client';
import { Component } from 'react';

/**
 * Diagnostic error boundary — catches "Rendered more hooks than during
 * the previous render" and similar React errors and shows the actual
 * message + component stack in the fallback UI so no browser DevTools
 * roundtrip is needed to pinpoint the culprit. Wrap any suspect region.
 */
export default class HooksErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null, componentStack: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ componentStack: errorInfo?.componentStack || null });
        // eslint-disable-next-line no-console
        console.error(
            `[HooksErrorBoundary:${this.props.label || 'unknown'}]`,
            error,
            errorInfo?.componentStack,
        );
    }

    render() {
        if (this.state.error) {
            const message = this.state.error?.message || String(this.state.error);
            // Extract the first component name from the React componentStack —
            // format looks like:  "\n    at Foo (...)\n    at Bar (...)"
            const stack = this.state.componentStack || '';
            const firstCompMatch = stack.match(/at\s+([A-Za-z0-9_]+)\s*\(/);
            const culprit = firstCompMatch ? firstCompMatch[1] : null;
            return (
                <div style={{
                    padding: '12px 16px',
                    margin: '8px 0',
                    borderRadius: 8,
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    fontSize: '0.82rem',
                    fontFamily: 'ui-monospace, Menlo, monospace',
                }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        Section failed{this.props.label ? ` — ${this.props.label}` : ''}
                        {culprit ? ` · culprit: ${culprit}` : ''}
                    </div>
                    <div style={{ marginBottom: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {message}
                    </div>
                    {stack && (
                        <details style={{ marginTop: 4 }}>
                            <summary style={{ cursor: 'pointer', opacity: 0.9 }}>Component stack</summary>
                            <pre style={{
                                margin: '6px 0 0', padding: 8, borderRadius: 6,
                                background: 'rgba(0,0,0,0.25)',
                                color: '#fca5a5',
                                fontSize: '0.75rem',
                                overflow: 'auto',
                                maxHeight: 260,
                            }}>{stack.trim()}</pre>
                        </details>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}
