interface FallbackMessageProps {
  title: string;
  message: string;
  details?: string;
}

export function FallbackMessage({ title, message, details }: FallbackMessageProps) {
  return (
    <div className="fallback" role="alert">
      <div className="card">
        <p className="eyebrow">Lagos Life</p>
        <h1>{title}</h1>
        <p>{message}</p>
        {details ? <pre className="details">{details}</pre> : null}
        <button type="button" className="button" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    </div>
  );
}
