import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";

export type PaletteCommand = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon?: IconName;
  shortcut?: string;
  run: () => void;
};

export function CommandPalette({
  open,
  commands,
  onClose,
}: {
  open: boolean;
  commands: PaletteCommand[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((command) =>
      `${command.label} ${command.hint ?? ""} ${command.keywords ?? ""}`.toLowerCase().includes(needle),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      window.clearTimeout(timer);
      previousFocus.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    const selected = listRef.current?.querySelector<HTMLElement>(`[data-command-index="${active}"]`);
    selected?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  function execute(command: PaletteCommand | undefined) {
    if (!command) return;
    onClose();
    command.run();
  }

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div
        className="palette"
        ref={paletteRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((current) => Math.min(current + 1, filtered.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            execute(filtered[active]);
          } else if (event.key === "Tab") {
            const focusable = paletteRef.current?.querySelectorAll<HTMLElement>(
              'input, button, [href], [tabindex]:not([tabindex="-1"])',
            );
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="palette-search">
          <Icon name="search" size={15} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages, actions and settings…"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-commands"
            aria-autocomplete="list"
            aria-activedescendant={filtered[active] ? `palette-option-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" ref={listRef} id="palette-commands" role="listbox" aria-label="Commands">
          {filtered.length === 0 && <div className="palette-empty">No matching commands.</div>}
          {filtered.map((command, index) => (
            <button
              key={command.id}
              type="button"
              id={`palette-option-${index}`}
              role="option"
              aria-selected={index === active}
              data-command-index={index}
              className={`palette-item ${index === active ? "active" : ""}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => execute(command)}
            >
              <span className="palette-icon">
                <Icon name={command.icon ?? "arrow-right"} size={15} />
              </span>
              <span className="palette-copy">
                <span>{command.label}</span>
                {command.hint && <small>{command.hint}</small>}
              </span>
              {command.shortcut && <kbd>{command.shortcut}</kbd>}
            </button>
          ))}
        </div>
        <div className="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>g</kbd> then section key</span>
        </div>
      </div>
    </div>
  );
}
