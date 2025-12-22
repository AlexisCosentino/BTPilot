const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit"
});

export const entrySubtypeLabels: Record<"task" | "client_change", string> = {
  task: "Tache",
  client_change: "Demande client"
};

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatTime(value: string | Date): string {
  return timeFormatter.format(new Date(value));
}
