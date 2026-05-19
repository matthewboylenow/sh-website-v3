import type { BaptismSubmission } from "@/lib/validators/baptism";
import type { PdfDocProps, PdfField, PdfSection } from "./intake-types";

function joinAddress(a: BaptismSubmission["familyAddress"]): string {
  if (!a) return "";
  const lines = [
    [a.line1, a.line2].filter(Boolean).join(", "),
    [a.city, a.state, a.zip].filter(Boolean).join(", "),
  ].filter(Boolean);
  return lines.join(" · ");
}

function fullName(first?: string | null, middle?: string | null, last?: string | null) {
  return [first, middle, last].filter(Boolean).join(" ").trim();
}

function f(label: string, value: PdfField["value"]): PdfField {
  return { label, value };
}

export function buildBaptismSections(v: BaptismSubmission): PdfSection[] {
  return [
    {
      eyebrow: "Section 1",
      title: "General contact",
      fields: [
        f("Phone / Mobile", v.phone),
        f("Email", v.email),
      ],
    },
    {
      eyebrow: "Section 2",
      title: "Child",
      fields: [
        f(
          "Name",
          fullName(v.childFirstName, v.childMiddleName, v.childLastName),
        ),
        f("Gender", v.childGender),
        f("Date of birth (or expected)", v.childDateOfBirth),
        f("Place of birth", v.childPlaceOfBirth),
        f("Place of birth — address", joinAddress(v.childBirthAddress)),
      ],
    },
    {
      eyebrow: "Section 3",
      title: "Mother",
      fields: [
        f(
          "Name",
          fullName(v.motherFirstName, v.motherMiddleName, v.motherLastName),
        ),
        f("Maiden name", v.motherMaidenName),
        f("Religion", v.motherReligion),
      ],
    },
    {
      eyebrow: "Section 4",
      title: "Father",
      fields: [
        f(
          "Name",
          fullName(v.fatherFirstName, v.fatherMiddleName, v.fatherLastName),
        ),
        f("Religion", v.fatherReligion),
      ],
    },
    {
      eyebrow: "Section 5",
      title: "Family",
      fields: [
        f("Family address", joinAddress(v.familyAddress)),
        f("Family phone", v.familyPhone),
        f("Parent marriage date", v.parentMarriageDate),
        f("Marriage location", v.marriageLocation),
        f("Marriage address", joinAddress(v.marriageAddress)),
        f("Registered parishioner?", v.registeredParishioner),
        f("Baptizing first child?", v.baptizingFirstChild),
        f("Ages of siblings", v.siblingAges),
      ],
    },
    {
      eyebrow: "Section 6",
      title: "Godmother",
      fields: [
        f("Name", fullName(v.godMotherFirstName, null, v.godMotherLastName)),
        f("Religion", v.godMotherReligion),
        f("Address", joinAddress(v.godMotherAddress)),
      ],
    },
    {
      eyebrow: "Section 7",
      title: "Godfather",
      fields: [
        f("Name", fullName(v.godFatherFirstName, null, v.godFatherLastName)),
        f("Religion", v.godFatherReligion),
        f("Address", joinAddress(v.godFatherAddress)),
      ],
    },
  ];
}

export async function renderBaptismPdf(args: {
  submission: BaptismSubmission;
  submittedAt: Date;
  submissionId: string;
}): Promise<Buffer> {
  const { renderIntakePdf } = await import("./intake");
  const props: PdfDocProps = {
    formTitle: "Baptism Intake Form",
    subjectLine: fullName(
      args.submission.childFirstName,
      args.submission.childMiddleName,
      args.submission.childLastName,
    ),
    submittedAt: args.submittedAt,
    submissionId: args.submissionId,
    sections: buildBaptismSections(args.submission),
  };
  return renderIntakePdf(props);
}
