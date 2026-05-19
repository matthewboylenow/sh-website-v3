import type { FuneralSubmission } from "@/lib/validators/funeral";
import type { PdfDocProps, PdfField, PdfSection } from "./intake-types";

function joinAddress(a: FuneralSubmission["deceasedAddress"]): string {
  if (!a) return "";
  const lines = [
    [a.line1, a.line2].filter(Boolean).join(", "),
    [a.city, a.state, a.zip].filter(Boolean).join(", "),
  ].filter(Boolean);
  return lines.join(" · ");
}

function f(label: string, value: PdfField["value"]): PdfField {
  return { label, value };
}

export function buildFuneralSections(v: FuneralSubmission): PdfSection[] {
  return [
    {
      eyebrow: "Section 1",
      title: "Form submission contact",
      fields: [
        f("Name of person filling out this form", v.fillerName),
        f("Email of person filling out this form", v.fillerEmail),
      ],
    },
    {
      eyebrow: "Section 2",
      title: "Mass scheduling",
      fields: [
        f("Date for the Mass", v.massDate),
        f("Time for the Mass", v.massTime),
      ],
    },
    {
      eyebrow: "Section 3",
      title: "Personal history",
      fields: [
        f("Name of the deceased", v.deceasedName),
        f("Nickname", v.deceasedNickname),
        f("Place of birth", v.placeOfBirth),
        f("Age of the deceased", v.deceasedAge),
        f("Date of birth", v.deceasedDateOfBirth),
        f("Marital status", v.maritalStatus),
        f("Is the spouse living or deceased?", v.spouseStatus),
        f("Spouse's name", v.spouseName),
        f("Years married", v.yearsMarried),
        f("Names of children", v.childrenNames),
        f("Names of grandchildren", v.grandchildrenNames),
        f("Names of great-grandchildren", v.greatGrandchildrenNames),
        f("Names of brothers / sisters", v.siblingsNames),
        f("Names of parents (living / deceased)", v.parentsNames),
        f("Was the deceased a parishioner?", v.wasParishioner),
        f("Deceased's address", joinAddress(v.deceasedAddress)),
      ],
    },
    {
      eyebrow: "Section 4",
      title: "Next of kin",
      fields: [
        f(
          "Name",
          [v.kinFirstName, v.kinLastName].filter(Boolean).join(" ").trim(),
        ),
        f("Relation to the deceased", v.kinRelation),
        f("Address", joinAddress(v.kinAddress)),
        f("Email", v.kinEmail),
        f("Phone / Mobile", v.kinPhone),
      ],
    },
    {
      eyebrow: "Section 5",
      title: "Background",
      fields: [
        f("Occupation", v.occupation),
        f("Qualities that made this person special", v.specialQualities),
        f("Special interests, hobbies, talents", v.hobbies),
      ],
    },
    {
      eyebrow: "Section 6",
      title: "Faith life",
      fields: [
        f("Relationship with God", v.relationshipWithGod),
        f("Ministries of the parish", v.parishInvolvement),
        f("Primary caregivers", v.primaryCaregivers),
        f("Special requests for the celebrant", v.specialRequests),
      ],
    },
    {
      eyebrow: "Section 7",
      title: "Mass of Christian Burial",
      fields: [
        f("Casket or cremated remains?", v.remains),
        ...(v.remains === "Other" ? [f("Other (specified)", v.remainsOther)] : []),
        f("Will family members place the pall?", v.familyPlacesPall),
      ],
    },
    {
      eyebrow: "Section 8",
      title: "Readings and lectors",
      fields: [
        f("Family chooses Scripture passages?", v.familyChoosesPassages),
        f("First Reading", v.firstReading),
        f("Second Reading", v.secondReading),
        f("Intercession option", v.intercessionOption),
        f("Family / friend serves as reader?", v.familyMemberReader),
        f("Reader — First Reading", v.readerFirstReading),
        f("Reader — Second Reading", v.readerSecondReading),
        f("Reader — Prayer of the Faithful", v.readerPrayerFaithful),
        f("Gift bearers", v.giftBearers),
        f("Words of Remembrance?", v.wordsOfRemembrance),
        f("Name of person delivering remembrance", v.wordsOfRemembrancePerson),
      ],
    },
    {
      eyebrow: "Section 9",
      title: "Livestream",
      fields: [f("Service livestreamed?", v.livestreamRequested)],
    },
    {
      eyebrow: "Section 10",
      title: "Music for the Mass",
      fields: [
        f("Entrance", v.entranceHymn),
        f("Psalm", v.psalm),
        f("Preparation", v.preparationHymn),
        f("Communion", v.communionHymn),
        f("Commendation", v.commendationHymn),
        f("Recessional", v.recessionalHymn),
        f("Other music requests", v.otherMusicRequests),
      ],
    },
  ];
}

export async function renderFuneralPdf(args: {
  submission: FuneralSubmission;
  submittedAt: Date;
  submissionId: string;
}): Promise<Buffer> {
  const { renderIntakePdf } = await import("./intake");
  const props: PdfDocProps = {
    formTitle: "Funeral Intake Form",
    subjectLine: args.submission.deceasedName,
    submittedAt: args.submittedAt,
    submissionId: args.submissionId,
    sections: buildFuneralSections(args.submission),
  };
  return renderIntakePdf(props);
}
