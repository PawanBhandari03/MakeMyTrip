import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { suggestPlaces } from "@/lib/places";

type Option = { value: string; label: string };

/**
 * A search box with a list of suggestions. The traveller can type a city, a state or country, another name for a
 * place ("Bangalore") or even a slightly wrong spelling ("dheradun"), and pick a suggestion with the mouse or the
 * arrow keys. `value` is always the current text, so the parent can use it directly as a filter.
 * When the traveller moves on after a clear spelling mistake, the text is corrected to the place we think they meant.
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
  const [active, setActive] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => suggestPlaces(options, value), [options, value]);
  const onlyGuesses = suggestions.length > 0 && suggestions.every((s) => s.kind === "fuzzy");

  // The latest text and suggestions, for the click-outside handler below
  const latest = useRef({ value, suggestions, onChange });
  latest.current = { value, suggestions, onChange };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Fix a clear spelling mistake when the traveller moves on, but never touch text that already names a place
        const { value: text, suggestions: list, onChange: change } = latest.current;
        const typed = text.trim().toLowerCase();
        if (!typed) return;
        const exact = list.some((s) => s.label.toLowerCase() === typed || s.value.toLowerCase() === typed);
        const best = list[0];
        const clear = best && (best.kind === "fuzzy" || best.kind === "alias") && (list.length === 1 || best.score > list[1].score);
        if (!exact && best && clear && best.kind === "fuzzy") change(best.value);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => setActive(0), [value]);

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
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setIsOpen(true);
                  setActive((a) => Math.min(a + 1, Math.max(0, suggestions.length - 1)));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter" && isOpen && suggestions.length > 0) {
                  e.preventDefault();
                  pick(suggestions[Math.min(active, suggestions.length - 1)].value);
                } else if (e.key === "Escape") {
                  setIsOpen(false);
                }
              }}
              className="w-full bg-transparent text-lg font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-300"
              placeholder={placeholder}
              autoComplete="off"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
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
        <div role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              No matching places. Try a city, a state or a country, such as <em>Goa</em>, <em>Kerala</em> or <em>Dubai</em>.
            </div>
          ) : (
            <>
              {onlyGuesses && <div className="px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-slate-400">Did you mean</div>}
              {suggestions.map((s, i) => (
                <button
                  key={s.value}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left text-sm ${i === active ? "bg-blue-50" : "hover:bg-blue-50"}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(s.value)}
                >
                  <span className="font-medium text-slate-900">{s.label}</span>
                  {s.hint && <span className="truncate text-xs text-slate-400">{s.hint}</span>}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
