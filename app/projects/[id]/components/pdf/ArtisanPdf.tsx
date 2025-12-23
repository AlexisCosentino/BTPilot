import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { Project, ProjectSummaries, StatusEvent } from "../../types";

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
  label: { fontSize: 10, color: "#6b7280" },
  value: { fontSize: 11, fontWeight: "bold" },
  text: { fontSize: 11, lineHeight: 1.5 },
  timelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottom: "1 solid #e5e7eb"
  },
  timelineText: { fontSize: 11 }
});

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  planned: "Planifie",
  in_progress: "En cours",
  on_hold: "En pause",
  completed: "Termine",
  canceled: "Annule"
};

function formatDate(value: Date) {
  return value.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
}

function formatStatus(status: string | null) {
  if (!status) return "Statut inconnu";
  return STATUS_LABELS[status] ?? status;
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

type ArtisanPdfProps = {
  project: Project;
  summaries: ProjectSummaries;
  statusEvents: StatusEvent[];
  exportDate: Date;
};

export function ArtisanPdf({ project, summaries, statusEvents, exportDate }: ArtisanPdfProps) {
  const headline =
    summaries.ai_summary_artisan_short ?? summaries.ai_summary_artisan ?? "Rien a signaler pour le moment.";
  const detail = summaries.ai_summary_artisan_detail ?? summaries.ai_summary_artisan ?? null;

  const sortedEvents = [...statusEvents].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.heading}>Export artisan - {project.name}</Text>
          <Text style={styles.label}>Exporte le {formatDate(exportDate)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Synthese rapide</Text>
          <View style={styles.card}>{renderTextBlock(headline)}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Journal detaille</Text>
          <View style={styles.card}>{renderTextBlock(detail)}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Historique des statuts</Text>
          <View style={styles.card}>
            {sortedEvents.length === 0 ? (
              <Text style={styles.text}>Aucun changement de statut enregistre.</Text>
            ) : (
              sortedEvents.map((event) => {
                const change = [event.old_status, event.new_status]
                  .filter(Boolean)
                  .map((status) => formatStatus(status || null))
                  .join(" -> ");
                const when = new Date(event.changed_at).toLocaleString("fr-FR");
                return (
                  <View key={event.id} style={styles.timelineRow}>
                    <Text style={styles.timelineText}>{when}</Text>
                    <Text style={styles.timelineText}>{change || formatStatus(event.new_status)}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
