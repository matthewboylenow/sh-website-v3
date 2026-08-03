"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  label = "What are you looking for?",
  placeholder = "Mass times, baptism, volunteering, livestream…",
}: {
  label?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const [outcome, setOutcome] = useState<SearchOutcome<CorpusCard> | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);

  const corpusPromise = useRef<Promise<Corpus | null> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCorpus = useCallback((): Promise<Corpus | null> => {
    if (!corpusPromise.current) {
      corpusPromise.current = fetch("/api/answers/corpus")
        .then((r) => (r.ok ? (r.json() as Promise<Corpus>) : null))
        .catch(() => null);
    }
    return corpusPromise.current;
  }, []);

  // Warm the corpus on first focus rather than on page load, so a visitor
  // who never uses the box never pays for it.
  const onFocus = useCallback(() => {
    void loadCorpus().then((c) => c && setCorpus(c));
  }, [loadCorpus]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (logTimer.current) clearTimeout(logTimer.current);
    };
  }, []);

  const run = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed.length < MIN_QUERY) {
        setOutcome(null);
        setSearchId(null);
        if (logTimer.current) clearTimeout(logTimer.current);
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
    [loadCorpus],
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
  const isDeadEnd = outcome !== null && !hasResults;

  return (
    <div className="w-full">
      <label htmlFor="answer-search" className="block text-sm font-semibold">
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
          className="form-input w-full pr-10"
          aria-describedby="answer-search-status"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOutcome(null);
              setSearchId(null);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-sm text-ink-3 hover:text-rust-dark"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <p id="answer-search-status" className="sr-only" role="status">
        {outcome === null
          ? ""
          : `${outcome.shownCount} result${outcome.shownCount === 1 ? "" : "s"}`}
      </p>

      {hasResults && (
        <div className="mt-4 space-y-4">
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
      )}

      {isDeadEnd && (
        <div className="mt-4 rounded-lg border border-dashed border-rule bg-cream/40 p-4 text-sm text-ink-2">
          <p>
            We don&rsquo;t have an answer written for that one yet, and
            we&rsquo;ve made a note of it.
          </p>
          <p className="mt-2">
            The Parish Office can help —{" "}
            <a
              href={`tel:${(corpus?.contacts.office?.phone ?? "").replace(/\D/g, "")}`}
              className="text-rust-dark hover:text-rust"
            >
              {corpus?.contacts.office?.phone || "call us"}
            </a>
            .
          </p>
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
