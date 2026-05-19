import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { PdfDocProps } from "./intake-types";

export type { PdfField, PdfSection, PdfDocProps } from "./intake-types";

/**
 * Parish intake-form PDFs. Used by the funeral and baptism flows.
 *
 * Styling brief: navy header bar, alternating row tint, bold labels,
 * generous whitespace. Uses the built-in Helvetica/Times faces so no
 * external font fetch happens at render time — keeps cold starts
 * snappy on Vercel serverless.
 */

const NAVY = "#1F346D";
const RUST = "#A73F25";
const GOLD = "#C9A24B";
const INK = "#1F1F1F";
const INK_MUTED = "#6B6B6B";
const RULE = "#E5E5E5";
const ROW_TINT = "#F7F5EF";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "white",
    paddingTop: 96,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: INK,
  },
  headerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: NAVY,
    padding: 24,
    paddingHorizontal: 48,
  },
  headerEyebrow: {
    color: GOLD,
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontFamily: "Times-Bold",
  },
  headerSubject: {
    color: "white",
    opacity: 0.85,
    fontSize: 10,
    marginTop: 4,
  },
  section: {
    marginTop: 18,
    marginBottom: 4,
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: RUST,
    paddingBottom: 4,
    marginBottom: 8,
  },
  sectionEyebrow: {
    color: RUST,
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  sectionTitle: {
    color: NAVY,
    fontSize: 13,
    fontFamily: "Times-Bold",
    marginTop: 2,
  },
  row: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  rowTinted: {
    backgroundColor: ROW_TINT,
  },
  label: {
    color: INK_MUTED,
    fontSize: 8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  value: {
    fontSize: 10,
    color: INK,
    lineHeight: 1.4,
  },
  valueMuted: {
    color: INK_MUTED,
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: INK_MUTED,
  },
});

const NBSP = " ";

function fmtDate(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function IntakePdf(props: PdfDocProps) {
  let rowIdx = 0;
  return (
    <Document
      title={`${props.formTitle} — Saint Helen`}
      author="Parish Community of Saint Helen"
      creator="sainthelen.org"
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerBar} fixed>
          <Text style={styles.headerEyebrow}>Parish of Saint Helen</Text>
          <Text style={styles.headerTitle}>{props.formTitle}</Text>
          {props.subjectLine && (
            <Text style={styles.headerSubject}>{props.subjectLine}</Text>
          )}
        </View>

        {props.sections.map((section, sIdx) => {
          const renderedFields = section.fields.filter(
            (f) => f.showIfBlank || (f.value && f.value.toString().trim()),
          );
          if (renderedFields.length === 0) return null;
          return (
            <View key={sIdx} style={styles.section} wrap={false}>
              <View style={styles.sectionHeader}>
                {section.eyebrow && (
                  <Text style={styles.sectionEyebrow}>{section.eyebrow}</Text>
                )}
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              {renderedFields.map((field, fIdx) => {
                const tint = rowIdx++ % 2 === 0;
                const value = (field.value ?? "").toString().trim() || NBSP;
                return (
                  <View
                    key={fIdx}
                    style={[styles.row, tint ? styles.rowTinted : {}]}
                  >
                    <Text style={styles.label}>{field.label}</Text>
                    <Text
                      style={[
                        styles.value,
                        value === NBSP ? styles.valueMuted : {},
                      ]}
                    >
                      {value === NBSP ? "—" : value}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={styles.footer} fixed>
          <Text>
            {fmtDate(props.submittedAt)}
            {"   ·   ID "}
            {props.submissionId.slice(0, 8)}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderIntakePdf(props: PdfDocProps): Promise<Buffer> {
  return renderToBuffer(<IntakePdf {...props} />);
}
