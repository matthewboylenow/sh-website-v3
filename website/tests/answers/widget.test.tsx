import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnswerSearch } from "@/components/site/answers/AnswerSearch";

/**
 * The widget's first paint. Full interaction lives in the browser and is
 * covered by the matching tests; what matters here is that the box renders
 * server-side without a corpus, is labelled, and announces itself to a
 * screen reader.
 *
 * The parish has parishioners using screen readers and iPads. A search box
 * that renders only after JavaScript settles is a search box some of them
 * never see.
 */

describe("AnswerSearch first paint", () => {
  const html = renderToStaticMarkup(<AnswerSearch />);

  it("renders the input without waiting for the corpus", () => {
    expect(html).toContain('id="answer-search"');
    expect(html).toContain('type="search"');
  });

  it("labels the input", () => {
    expect(html).toContain('for="answer-search"');
    expect(html).toContain("What are you looking for?");
  });

  it("carries the parish's own placeholder rather than a generic one", () => {
    expect(html).toContain("Mass times, baptism, volunteering");
  });

  it("wires a live region for results", () => {
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-describedby="answer-search-status"');
  });

  it("accepts custom copy", () => {
    const custom = renderToStaticMarkup(
      <AnswerSearch label="Ask us anything" placeholder="Try: confession" />,
    );
    expect(custom).toContain("Ask us anything");
    expect(custom).toContain("Try: confession");
  });

  it("shows no results and no dead-end message before anyone types", () => {
    expect(html).not.toContain("Did this help?");
    expect(html).not.toContain("we've made a note of it");
    expect(html).not.toContain("Pages that might help");
  });

  it("does not ship a clear button until there is something to clear", () => {
    expect(html).not.toContain("Clear search");
  });
});
