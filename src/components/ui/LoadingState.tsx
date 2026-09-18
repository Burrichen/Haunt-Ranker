import { Loader2 } from "lucide-react";
import "./LoadingState.css";

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <Loader2 className="loading-state__spinner" size={22} aria-hidden="true" />
      <span className="loading-state__label">{label}</span>
    </div>
  );
}
