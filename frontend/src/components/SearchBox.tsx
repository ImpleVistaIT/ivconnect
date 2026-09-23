import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { searchModules } from "../modules";
import { useAuth } from "../context/AuthContext";
import "./SearchBox.css";

export default function SearchBox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchModules(user?.roles ?? [], query), [user, query]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function go(path: string) {
    navigate(path);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      go(results[activeIndex].path);
    }
  }

  return (
    <div className={`searchbox${open ? " searchbox--open" : ""}`} ref={boxRef}>
      <div className="searchbox__field">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search employees, payslips, leave"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="searchbox-results"
        />
        {open && results.length > 0 && (
          <ul className="searchbox__results" id="searchbox-results" role="listbox">
            {results.map((m, i) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`searchbox__result${i === activeIndex ? " searchbox__result--active" : ""}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => go(m.path)}
                >
                  <Icon name={m.icon} size={16} />
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && query && results.length === 0 && (
          <div className="searchbox__empty">No pages match &ldquo;{query}&rdquo;</div>
        )}
      </div>
      <button className="ib" type="button" aria-label="Search" onClick={() => setOpen((v) => !v)}>
        <Icon name="search" size={17} />
      </button>
    </div>
  );
}
