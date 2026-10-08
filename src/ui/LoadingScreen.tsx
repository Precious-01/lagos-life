export function LoadingScreen() {
  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>Loading Lagos…</p>
    </div>
  );
}
