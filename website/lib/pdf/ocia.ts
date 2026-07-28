import type { OciaSubmission } from "../validators/ocia";
import type { PdfDocProps, PdfField, PdfSection } from "./intake-types";

/**
 * Section builders for the OCIA inquirer form. Kept free of
 * @react-pdf/renderer imports so the admin detail page can render the
 * same structure as HTML — renderOciaPdf dynamic-imports the heavy bits.
 */

function f(label: string, value: string | null | undefined): PdfField {
  return { label, value };
}

export function buildOciaSections(v: OciaSubmission): PdfSection[] {
  return [
    {
      eyebrow: "Section 1",
      title: "Contact",
      fields: [
        f("Name", `${v.firstName} ${v.lastName}`.trim()),
        f("Email", v.email),
        f("Phone", v.phone),
      ],
    },
    {
      eyebrow: "Section 2",
      title: "Religious background",
      fields: [
        f("Current religious affiliation", v.currentAffiliation),
        f("Ever been baptized?", v.baptized),
        f("Baptism details", v.baptismDetails),
        f(
          "Sacraments received (if baptized Catholic)",
          (v.sacramentsReceived ?? []).join(" · "),
        ),
        f("Current marital status", v.maritalStatus),
      ],
    },
    {
      eyebrow: "Section 3",
      title: "Your journey",
      fields: [
        f("What or who has led you to want to know more about Catholicism?", v.whatLedYou),
        f("Religious education as a child and adult", v.religiousEducation),
        f("Interactions with the Catholic faith", v.catholicInteractions),
        f("Questions or concerns about the Catholic faith", v.questionsConcerns),
        f("Who is Jesus Christ to you?", v.whoIsJesus),
        f("Which statement resonates most right now?", v.resonates),
      ],
    },
  ];
}

export async function renderOciaPdf(args: {
  submission: OciaSubmission;
  submittedAt: Date;
  submissionId: string;
}): Promise<Buffer> {
  const { renderIntakePdf } = await import("./intake");
  const props: PdfDocProps = {
    formTitle: "OCIA Inquirer Form",
    subjectLine: `${args.submission.firstName} ${args.submission.lastName}`.trim(),
    submittedAt: args.submittedAt,
    submissionId: args.submissionId,
    sections: buildOciaSections(args.submission),
  };
  return renderIntakePdf(props);
}
