import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const TRANSITION_MS = 420;

export function PageTransitionLoader() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [location]);

  return (
    <div
      className={`page-transition-loader ${visible ? "is-visible" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <div className="spotlight-loader" aria-label="Loading page">
        <div className="spotlight-loader__lamp">
          <span className="spotlight-loader__handle" />
          <span className="spotlight-loader__head" />
        </div>
        <div className="spotlight-loader__beam" />
        <div className="spotlight-loader__dot" />
      </div>
      <span className="page-transition-loader__label">Finding your next spotlight…</span>
    </div>
  );
}
