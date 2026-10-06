import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

/**
 * A search box with a dropdown of suggestions. The user can pick a suggestion or type freely;
 * `value` is always the current text, so the parent can use it directly as a filter.
 */
export function SearchSelect({
  options,
  placeholder,
  value,
  onChange,
  icon,
  subtitle,
}: {
  options: Option[];
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  subtitle?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const term = value.trim().toLowerCase();
  const filtered = options.filter((o) => o.label.toLowerCase().includes(term)).slice(0, 50);

  const pick = (v: string) => {
    onChange(v);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative h-full">
      <div
        className={`h-full rounded-xl border p-3 transition-colors bg-white ${
          isOpen ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-400"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-slate-400 shrink-0">{icon}</span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{placeholder}</div>
            <input
              type="text"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isOpen && filtered.length > 0) {
                  e.preventDefault();
                  pick(filtered[0].value);
                } else if (e.key === "Escape") {
                  setIsOpen(false);
                }
              }}
              className="w-full bg-transparent text-lg font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-300"
              placeholder={placeholder}
              autoComplete="off"
            />
            <div className="truncate text-xs text-slate-400">{subtitle}</div>
          </div>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Show suggestions"
            className="text-slate-400 hover:text-slate-600"
            onClick={() => setIsOpen((o) => !o)}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">No matching places</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                className="block w-full px-4 py-2 text-left text-sm hover:bg-blue-50"
                onClick={() => pick(o.value)}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
