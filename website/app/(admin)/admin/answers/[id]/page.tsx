import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { answerCards } from "@/db/schema";
import { canWriteContent } from "@/lib/authz";
import { parishToday } from "@/lib/answers/corpus.query";
import { resolveCard } from "@/lib/answers/resolve";
import { AnswerCardForm } from "../AnswerCardForm";
import { DeleteAnswerCardButton } from "./DeleteAnswerCardButton";

export const metadata = { title: "Edit answer card · Admin" };

export default async function EditAnswerCard({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const session = await auth();
  if (!session?.user) redirect(`/sign-in?callbackUrl=/admin/answers/${id}`);
  if (!canWriteContent(session.user.role)) redirect("/admin");

  const [card] = await db
    .select()
    .from(answerCards)
    .where(eq(answerCards.id, id))
    .limit(1);
  if (!card) notFound();

  // What this card would say if somebody searched right now. A seasonal
  // card out of season resolves to nothing, and it is much better to see
  // that here than to wonder why it never appears.
  const today = parishToday();
  const resolved = resolveCard(
    {
      key: card.key,
      title: card.title,
      answer: card.answer,
      group: card.group,
      triggers: card.triggers,
      links: card.links,
      moments: card.moments,
      contact: card.contact,
      pastoral: card.pastoral,
      note: card.note,
      source: card.source,
      activation: card.activation ?? null,
    },
    today,
  );

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/answers" className="hover:text-rust-dark">
          Answer cards
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{card.title}</span>
      </nav>

      {saved && (
        <p className="mb-4 rounded-md border-l-4 border-[#3F7D58] bg-[#E6F0EA] px-4 py-2 text-sm text-[#3F7D58]">
          Saved.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl">{card.title}</h1>
        <DeleteAnswerCardButton id={card.id} title={card.title} />
      </div>

      <div
        className={`mt-4 rounded-md border-l-4 px-4 py-3 text-sm ${
          card.status !== "published"
            ? "border-rule bg-cream text-ink-2"
            : resolved
              ? "border-[#3F7D58] bg-[#E6F0EA] text-[#3F7D58]"
              : "border-gold bg-[#F6EEDC] text-[#7A5E12]"
        }`}
      >
        {card.status !== "published" ? (
          <>Not published, so it is not answering searches.</>
        ) : resolved ? (
          <>Live — this card is answering searches today.</>
        ) : (
          <>
            Published, but not findable today. Either a dated line set to
            archive has passed, or it is out of season.
          </>
        )}
      </div>

      <div className="mt-8">
        <AnswerCardForm mode="edit" card={card} />
      </div>
    </div>
  );
}
