/**
 * Lightweight types for intake PDF layouts. Split from `intake.tsx`
 * so consumers that only need the data shape (e.g. the admin detail
 * page rendering submissions to HTML) don't pull in @react-pdf/renderer.
 */

export type PdfField = {
  label: string;
  value: string | null | undefined;
  /** When true, render even if blank; otherwise skipped. */
  showIfBlank?: boolean;
};

export type PdfSection = {
  eyebrow?: string;
  title: string;
  fields: PdfField[];
};

export type PdfDocProps = {
  formTitle: string;
  subjectLine?: string;
  submittedAt: Date;
  submissionId: string;
  sections: PdfSection[];
};
