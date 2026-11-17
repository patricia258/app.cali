export const statusNames: Record<string, string> = {
  approved: "Aprovados",
  in_progress: "Em andamento",
  client_review: "Com cliente",
  internal_review: "Revisão interna",
  adjustment_requested: "Ajuste",
  rebriefing: "Rebriefing",
  not_started: "Não iniciado",
  standby: "Standby",
};

export function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1).replace(".", ",")}h`;
}
export function dateLabel(value?: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Sem data"
    : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
        .format(date)
        .replace(".", "");
}
