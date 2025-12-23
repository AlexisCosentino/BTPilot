import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { Project, ProjectSummaries } from "../../types";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica", color: "#0f172a" },
  section: { marginBottom: 16 },
  heading: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  subheading: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase", color: "#475569" },
  card: {
    borderRadius: 8,
    border: "1 solid #e5e7eb",
    padding: 12,
    backgroundColor: "#f8fafc"
  },
  row: { flexDirection: "row", marginBottom: 6, flexWrap: "wrap" },
  rowItem: { marginRight: 12, marginBottom: 6 },
  label: { fontSize: 10, color: "#6b7280" },
  value: { fontSize: 11, fontWeight: "bold" },
  text: { fontSize: 11, lineHeight: 1.5 }
});

function formatDate(value: Date) {
  return value.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
}

function formatClientName(project: Project) {
  const first = project.client_first_name?.trim() ?? "";
  const last = project.client_last_name?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || "Client non renseigne";
}

function formatAddress(project: Project) {
  const cityLine = [project.client_postal_code?.trim(), project.client_city?.trim()]
    .filter(Boolean)
    .join(" ");
  const parts = [project.client_address?.trim(), cityLine].filter(Boolean);
  return parts.join(", ") || "Adresse non renseignee";
}

function formatContact(project: Project) {
  const contacts = [project.client_phone?.trim(), project.client_email?.trim()].filter(Boolean);
  return contacts.join(" | ") || "Coordonnees non renseignees";
}

function renderTextBlock(text: string | null) {
  if (!text || !text.trim()) {
    return <Text style={styles.text}>Resume indisponible.</Text>;
  }

  return text.split(/\r?\n/).map((line, idx) => (
    <Text key={`line-${idx}`} style={styles.text}>
      {line.trim()}
    </Text>
  ));
}

type ClientPdfProps = {
  project: Project;
  summaries: ProjectSummaries;
  exportDate: Date;
};

export function ClientPdf({ project, summaries, exportDate }: ClientPdfProps) {
  const headline =
    summaries.ai_summary_client_short ?? summaries.ai_summary_client ?? "Rien a signaler pour le moment.";
  const detail = summaries.ai_summary_client_detail ?? summaries.ai_summary_client ?? null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.heading}>Export client - {project.name}</Text>
          <Text style={styles.label}>Exporte le {formatDate(exportDate)}</Text>
        </View>

        <View style={[styles.section, styles.card]}>
          <Text style={styles.subheading}>Informations client</Text>
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Client</Text>
              <Text style={styles.value}>{formatClientName(project)}</Text>
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Coordonnees</Text>
              <Text style={styles.value}>{formatContact(project)}</Text>
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Adresse</Text>
              <Text style={styles.value}>{formatAddress(project)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Message principal</Text>
          <View style={styles.card}>{renderTextBlock(headline)}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Details</Text>
          <View style={styles.card}>{renderTextBlock(detail)}</View>
        </View>
      </Page>
    </Document>
  );
}
