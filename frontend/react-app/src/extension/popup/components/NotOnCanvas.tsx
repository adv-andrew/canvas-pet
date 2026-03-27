export function NotOnCanvas() {
  return (
    <div className="not-on-canvas">
      <div className="not-on-canvas-icon">📚</div>
      <h2>Not on Canvas</h2>
      <p>Navigate to your Canvas page and re-open this popup.</p>
      <a
        href="https://canvas.instructure.com"
        target="_blank"
        rel="noreferrer"
        className="canvas-link"
      >
        Open Canvas →
      </a>
    </div>
  )
}
