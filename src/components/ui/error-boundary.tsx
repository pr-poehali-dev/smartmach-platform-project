import { Component, type ReactNode, type ErrorInfo } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name ?? "unknown"}]`, error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[320px] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <Icon name="TriangleAlert" size={28} className="text-red-400" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">Что-то пошло не так</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            В этом разделе произошла ошибка. Остальная часть приложения работает в штатном режиме.
          </p>
          <details className="mb-4 text-left w-full max-w-sm">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Подробности ошибки
            </summary>
            <pre className="mt-2 p-3 bg-secondary rounded-lg text-xs text-red-600 overflow-auto whitespace-pre-wrap break-all">
              {this.state.error.message}
            </pre>
          </details>
          <button
            onClick={this.reset}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
            <Icon name="RotateCcw" size={14} />Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
