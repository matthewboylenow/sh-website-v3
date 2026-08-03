"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { search, type SearchOutcome } from "@/lib/answers/match";
import type { CorpusCard, CorpusPage } from "@/lib/answers/types";

/**
 * The search box.
 *
 * Everything except logging happens in the browser: the corpus arrives once,
 * matching runs locally, and results appear as fast as someone can type. No
 * model runs, so nothing can be invented and nothing costs money per search.
 *
 * Two debounces, doing different jobs. 180ms before searching, which is just
 * enough to avoid re-rendering on every keystroke. 1200ms before logging,
 * because the old parish helper logged every letter and inflated its own
 * numbers about fivefold — every report it produced was meaningless.
 *
 * `variant="hero"` puts it over the homepage video: a dark scrim so it
 * survives a bright frame, and results in a floating panel so the hero never
 * shifts under someone's cursor. On a phone the panel becomes a bottom sheet.
 */

type Contacts = Record<string, { name: string; phone: string; email: string }>;

type Corpus = {
  cards: CorpusCard[];
  pages: CorpusPage[];
  contacts: Contacts;
};

const SEARCH_DEBOUNCE_MS = 180;
const LOG_DEBOUNCE_MS = 1200;
const MIN_QUERY = 2;

/** Room the panel needs below the box before it stops opening upward. */
const PANEL_MIN_SPACE_PX = 380;

async function post(body: unknown): Promise<Record<string, unknown>> {
  try {
    const r = await fetch("/api/answers/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    return (await r.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function AnswerSearch({
  variant = "default",
  label = "What are you looking for?",
  placeholder = "Mass times, baptism, volunteering, livestream…",
}: {
  variant?: "default" | "hero";
  label?: string;
  placeholder?: string;
}) {
  const hero = variant === "hero";

  const [query, setQuery] = useState("");
  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const [outcome, setOutcome] = useState<SearchOutcome<CorpusCard> | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [openUpward, setOpenUpward] = useState(false);
  const [isSmall, setIsSmall] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const corpusPromise = useRef<Promise<Corpus | null> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOpen = outcome !== null;

  const close = useCallback(() => {
    setOutcome(null);
    setSearchId(null);
    if (logTimer.current) clearTimeout(logTimer.current);
  }, []);

  const loadCorpus = useCallback((): Promise<Corpus | null> => {
    if (!corpusPromise.current) {
      corpusPromise.current = fetch("/api/answers/corpus")
        .then((r) => (r.ok ? (r.json() as Promise<Corpus>) : null))
        .catch(() => null);
    }
    return corpusPromise.current;
  }, []);

  // Warm the corpus on first focus rather than page load, so a visitor who
  // never uses the box never pays for it.
  const onFocus = useCallback(() => {
    void loadCorpus().then((c) => c && setCorpus(c));
  }, [loadCorpus]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsSmall(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (logTimer.current) clearTimeout(logTimer.current);
    };
  }, []);

  // Escape and click-away.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [isOpen, close]);

  /**
   * Give way to the navigation.
   *
   * The mobile drawer locks body scroll when it opens. Rather than winning a
   * stacking race — which would put search results on top of the menu, and is
   * worse than losing it — the panel simply closes.
   */
  useEffect(() => {
    if (!isOpen) return;
    const observer = new MutationObserver(() => {
      if (document.body.style.overflow === "hidden") close();
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    return () => observer.disconnect();
  }, [isOpen, close]);

  // Decide which way the panel opens before the browser paints it, so it
  // never appears in one place and jumps to another.
  useLayoutEffect(() => {
    if (!isOpen || !hero || isSmall) return;
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    setOpenUpward(window.innerHeight - box.bottom < PANEL_MIN_SPACE_PX);
  }, [isOpen, hero, isSmall, outcome]);

  // A second search must not inherit the first one's scroll offset, or the
  // answer opens mid-paragraph.
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [outcome]);

  const run = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed.length < MIN_QUERY) {
        close();
        return;
      }

      void loadCorpus().then((c) => {
        if (!c) return;
        setCorpus(c);
        const result = search(trimmed, c.cards, c.pages);
        setOutcome(result);
        // A new search invalidates the old row, so a click is never
        // attributed to the previous query.
        setSearchId(null);

        if (logTimer.current) clearTimeout(logTimer.current);
        logTimer.current = setTimeout(() => {
          void post({
            type: "search",
            query: trimmed,
            kind: result.kind,
            card: result.topCardKey,
            shownCount: result.shownCount,
            matchCount: result.matchCount,
          }).then((r) => {
            if (typeof r.searchId === "string") setSearchId(r.searchId);
          });
        }, LOG_DEBOUNCE_MS);
      });
    },
    [loadCorpus, close],
  );

  const onChange = (value: string) => {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => run(value), SEARCH_DEBOUNCE_MS);
  };

  const onResultClick = (url: string) => {
    if (!searchId) return;
    void post({ type: "click", searchId, url });
  };

  const hasResults =
    outcome !== null && (outcome.cards.length > 0 || outcome.pages.length > 0);

  // The panel floats in hero mode so the page beneath never reflows. In the
  // ordinary mode it sits in the flow, where pushing content down is fine.
  const panelClass = !hero
    ? "mt-4 space-y-4"
    : isSmall
      ? "fixed inset-x-0 bottom-0 z-30 max-h-[78vh] overflow-y-auto rounded-t-2xl border-t border-rule bg-cream p-4 shadow-[0_-20px_50px_rgba(15,26,53,0.3)]"
      : `absolute z-30 w-full max-h-[70vh] overflow-y-auto rounded-xl border border-rule bg-cream p-4 shadow-[0_30px_60px_rgba(15,26,53,0.34)] ${
          openUpward ? "bottom-full mb-3" : "top-full mt-3"
        }`;

  return (
    <div ref={wrapRef} className={hero ? "relative w-full sm:max-w-md" : "w-full"}>
      {/* The dim lives inside the widget. Appending it to <body> would put
          it above the panel, because the wrapper is its own stacking
          context — that exact bug shipped once already. */}
      {hero && isSmall && isOpen && (
        <div aria-hidden="true" className="fixed inset-0 z-20 bg-black/50" />
      )}

      <div
        className={
          hero
            ? "sh-on-dark rounded-xl bg-navy/75 p-4 ring-1 ring-white/20 backdrop-blur-md"
            : ""
        }
      >
        <label
          htmlFor="answer-search"
          className={`block text-sm font-semibold ${hero ? "text-white" : ""}`}
        >
          {label}
        </label>
        <div className="relative mt-2">
          <input
            id="answer-search"
            type="search"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            placeholder={placeholder}
            autoComplete="off"
            className={
              hero
                ? "w-full rounded-pill border border-white/25 bg-white/95 px-4 py-3 pr-10 text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-rust focus:ring-offset-2 focus:ring-offset-navy"
                : "form-input w-full pr-10"
            }
            // Deliberately not a combobox. The panel holds paragraphs,
            // links and Yes/No buttons, not a list of options, so the
            // listbox pattern would describe it wrongly and trap a screen
            // reader in an interaction that has no options to choose. The
            // live region below announces the result count instead.
            aria-describedby="answer-search-status"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                close();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-1 text-lg leading-none text-ink-3 hover:text-rust-dark"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <p id="answer-search-status" className="sr-only" role="status">
        {outcome === null
          ? ""
          : `${outcome.shownCount} result${outcome.shownCount === 1 ? "" : "s"}`}
      </p>

      {isOpen && (
        <div ref={panelRef} className={panelClass}>
          {hero && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-full px-2 py-1 text-sm text-ink-3 hover:text-rust-dark"
              >
                Close
              </button>
            </div>
          )}

          {hasResults ? (
            <div className="space-y-4">
              {outcome.cards.map((card, i) => (
                <AnswerCardView
                  key={card.k}
                  card={card}
                  contacts={corpus?.contacts ?? {}}
                  position={i + 1}
                  shown={outcome.cards.map((c) => c.k)}
                  resultCount={outcome.shownCount}
                  query={query.trim()}
                  searchId={searchId}
                  onLinkClick={onResultClick}
                />
              ))}

              {outcome.pages.length > 0 && (
                <div className="rounded-lg border border-rule bg-white p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
                    {outcome.cards.length > 0
                      ? "More pages that might help"
                      : "Pages that might help"}
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {outcome.pages.map((p) => (
                      <li key={p.u}>
                        <a
                          href={p.u}
                          onClick={() => onResultClick(p.u)}
                          className="text-sm text-rust-dark hover:text-rust"
                        >
                          {p.t}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-rule bg-white p-4 text-sm text-ink-2">
              <p>
                We don&rsquo;t have an answer written for that one yet, and
                we&rsquo;ve made a note of it.
              </p>
              <p className="mt-2">
                The Parish Office can help
                {corpus?.contacts.office?.phone ? (
                  <>
                    {" — "}
                    <a
                      href={`tel:${corpus.contacts.office.phone.replace(/\D/g, "")}`}
                      className="text-rust-dark hover:text-rust"
                    >
                      {corpus.contacts.office.phone}
                    </a>
                  </>
                ) : null}
                .
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnswerCardView({
  card,
  contacts,
  position,
  shown,
  resultCount,
  query,
  searchId,
  onLinkClick,
}: {
  card: CorpusCard;
  contacts: Contacts;
  position: number;
  shown: string[];
  resultCount: number;
  query: string;
  searchId: string | null;
  onLinkClick: (url: string) => void;
}) {
  const [voted, setVoted] = useState<null | boolean>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wanted, setWanted] = useState("");
  const [wantedSent, setWantedSent] = useState(false);

  const contact = card.c ? contacts[card.c] : undefined;

  const vote = (helpful: boolean) => {
    if (voted !== null) return;
    setVoted(helpful);
    void post({
      type: "feedback",
      card: card.k,
      helpful,
      query,
      searchId,
      shown,
      position,
      resultCount,
    }).then((r) => {
      if (!helpful && typeof r.feedbackToken === "string") {
        setToken(r.feedbackToken);
      }
    });
  };

  const sendWanted = () => {
    const text = wanted.trim();
    if (!text || !token || wantedSent) return;
    setWantedSent(true);
    void post({ type: "wanted", token, text });
  };

  return (
    <div className="rounded-lg border border-rule bg-white p-5">
      {card.a
        .split("\n")
        .filter(Boolean)
        .map((para, i) => (
          <p key={i} className={i === 0 ? "" : "mt-2"}>
            {para}
          </p>
        ))}

      {card.next && (
        <p className="mt-3 rounded-md bg-cream px-3 py-2 text-sm">
          <strong>{card.next.label}</strong>
          {card.next.where ? ` in ${card.next.where}` : ""} ·{" "}
          {formatWhen(card.next.when)}
        </p>
      )}

      {card.past.length > 0 && (
        <p className="mt-2 text-sm text-ink-3">
          {card.past.join(". ")} has already taken place.
        </p>
      )}

      {card.l.length > 0 && (
        <ul className="mt-3 space-y-1">
          {card.l.map(([label, url]) => (
            <li key={url}>
              <a
                href={url}
                onClick={() => onLinkClick(url)}
                target={url.startsWith("http") ? "_blank" : undefined}
                rel={url.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-sm text-rust-dark hover:text-rust"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      )}

      {contact && (contact.phone || contact.email) && (
        <p className="mt-3 text-sm text-ink-2">
          {contact.name}
          {contact.phone ? ` · ${contact.phone}` : ""}
          {contact.email ? ` · ${contact.email}` : ""}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3 border-t border-rule pt-3 text-sm">
        {voted === null ? (
          <>
            <span className="text-ink-3">Did this help?</span>
            <button
              type="button"
              onClick={() => vote(true)}
              className="rounded-pill border border-rule px-3 py-1 hover:border-rust hover:text-rust-dark"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => vote(false)}
              className="rounded-pill border border-rule px-3 py-1 hover:border-rust hover:text-rust-dark"
            >
              No
            </button>
          </>
        ) : (
          <span className="text-ink-3">
            {voted
              ? "Thank you."
              : "Thank you, we will take another look at this one."}
          </span>
        )}
      </div>

      {voted === false && token && !wantedSent && (
        <div className="mt-3">
          <label
            htmlFor={`wanted-${card.k}`}
            className="block text-sm text-ink-2"
          >
            What were you looking for?
          </label>
          <p className="mt-1 text-xs text-ink-3">
            Please leave out personal details. If you need a reply, call the
            Parish Office.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              id={`wanted-${card.k}`}
              type="text"
              value={wanted}
              onChange={(e) => setWanted(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendWanted();
                }
              }}
              maxLength={300}
              autoComplete="off"
              placeholder="In your own words, if you like"
              className="form-input flex-1 text-sm"
            />
            <button
              type="button"
              onClick={sendWanted}
              className="rounded-pill bg-rust px-4 py-2 text-sm font-semibold text-white hover:bg-rust-dark"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {wantedSent && (
        <p className="mt-3 text-sm text-ink-3">
          Thank you, that is genuinely useful.
        </p>
      )}
    </div>
  );
}

/** "2026-09-15T19:00" → "Tuesday, September 15 at 7:00 PM" */
function formatWhen(when: string): string {
  const [datePart, timePart] = when.split("T");
  const [y, m, d] = (datePart ?? "").split("-").map(Number);
  if (!y || !m || !d) return when;

  const date = new Date(Date.UTC(y, m - 1, d));
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);

  if (!timePart || timePart === "00:00") return day;
  const [hh, mm] = timePart.split(":").map(Number);
  if (hh === undefined || mm === undefined) return day;
  const suffix = hh >= 12 ? "PM" : "AM";
  const hour = hh % 12 === 0 ? 12 : hh % 12;
  return `${day} at ${hour}:${String(mm).padStart(2, "0")} ${suffix}`;
}
