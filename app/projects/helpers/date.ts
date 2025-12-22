const projectDateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export function formatProjectDate(value: string | Date) {
  return projectDateFormatter.format(new Date(value));
}
