/**
 * Converte datas de formulário sem deslocar o dia no fuso do Brasil.
 * `new Date("AAAA-MM-DD")` nasce à meia-noite UTC e pode aparecer como o dia
 * anterior. Meio-dia UTC mantém a data civil estável para a operação.
 */
export function parseDataOperacional(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value);
  const text = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T12:00:00.000Z`)
    : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}
