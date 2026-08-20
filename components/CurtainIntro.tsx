"use client";

import { useEffect, useState } from "react";
import { consumeJustLoggedIn } from "@/lib/session";

export default function CurtainIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!consumeJustLoggedIn()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
      <div className="curtain-glow" />
      <div className="curtain-panel curtain-left" />
      <div className="curtain-panel curtain-right" />
    </div>
  );
}
