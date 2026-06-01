import { toUserError } from "../../utils/user-error";

type ErrorStateProps = {
  error: unknown;
  fallbackTitle?: string;
  fallbackMessage: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: "block" | "notice";
};

export function ErrorState({
  error,
  fallbackTitle,
  fallbackMessage,
  onRetry,
  retryLabel = "重试",
  variant = "block",
}: ErrorStateProps) {
  const userError = toUserError(error, {
    title: fallbackTitle,
    message: fallbackMessage,
  });
  const canRetry = Boolean(onRetry) && userError.retryable;

  if (variant === "notice") {
    return (
      <div className="notice error error-notice">
        <span>{userError.message}</span>
        {canRetry ? (
          <button className="notice-action" onClick={onRetry} type="button">
            {retryLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <section className="empty-state error-state">
      <div>
        <p className="eyebrow">{userError.title}</p>
        <h2>{fallbackTitle ?? userError.title}</h2>
        <p>{userError.message}</p>
        {canRetry ? (
          <button className="primary-button" onClick={onRetry} type="button">
            {retryLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
