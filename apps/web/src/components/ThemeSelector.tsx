import { useState, useEffect, useRef } from "react";
import { Palette, Check } from "lucide-react";

type Theme = "dark" | "light";

export function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return (saved as Theme) || "light";
  });
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const themes: { id: Theme; label: string }[] = [
    { id: "light", label: "Light (Snorlax)" },
    { id: "dark", label: "Dark (Gengar)" },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--white-08)] transition-colors focus:ring-2 focus:ring-[var(--accent)] outline-none"
        aria-label="Choose theme"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Palette className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-[var(--shadow-subtle)] py-2 z-50">
          <div className="px-4 py-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
            Choose theme
          </div>
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-[var(--white-08)] ${
                theme === t.id ? "text-[var(--accent)] font-medium" : "text-[var(--text-primary)]"
              }`}
            >
              {t.label}
              {theme === t.id && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
