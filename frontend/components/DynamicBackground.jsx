"use client";
import React, { useEffect, useState, useMemo } from "react";
import { THEME_ICONS } from "./DecorIcons";

const getCurrentTheme = () => {
  const d = new Date().getDate(), m = new Date().getMonth() + 1;
  if ((m === 8 && d >= 30) || (m === 9 && d <= 4)) return "quocKhanh";
  if ((m === 12 && d >= 28) || (m === 1 && d <= 3)) return "tetDuongLich";
  if ((m === 1 && d >= 25) || (m === 2 && d <= 10)) return "tetAmLich"; 
  if (m === 9 && d >= 15 && d <= 30) return "trungThu";
  if (d <= 10) {
    if (m === 3) return "spring"; if (m === 6) return "summer";
    if (m === 9) return "autumn"; if (m === 12) return "winter";
  }
  return "default";
};

export default function DynamicBackground() {
  const [scrollY, setScrollY] = useState(0);
  const [theme, setTheme] = useState("default");

  useEffect(() => {
    setTheme(getCurrentTheme());
    const handleScroll = () => window.requestAnimationFrame(() => setScrollY(window.scrollY));
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const items = useMemo(() => Array.from({ length: 14 }).map((_, i) => ({
    id: i, iconIndex: i % 5, side: i % 2 === 0 ? "left" : "right",
    offset: `${Math.random() * 6 + 2}%`, top: `${Math.random() * 145 + 5}%`, speed: Math.random() * 0.4 + 0.2
  })), []);

  const currentIcons = THEME_ICONS?.[theme] || THEME_ICONS?.["default"];
  if (!currentIcons || currentIcons.length === 0) return null; 

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden text-red-600 opacity-20">
      {items.map((item) => (
        <div key={item.id} className="absolute w-16 h-16 sm:w-20 sm:h-20"
          style={{ top: item.top, [item.side]: item.offset, transform: `translateY(${scrollY * item.speed}px)` }}
          dangerouslySetInnerHTML={{ __html: currentIcons[item.iconIndex] }} />
      ))}
    </div>
  );
}
