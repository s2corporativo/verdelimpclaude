export interface EvidenciaDocumento {
  exists: boolean;
  expiresAt?: Date | string | null;
  status?: string | null;
  source?: "manual" | "automatico";
}

export interface RequisitoElegibilidade {
  id: string;
  name: string;
  scope: "EMPRESA" | "FUNCIONARIO" | "EQUIPAMENTO" | string;
  blocking?: boolean;
  role?: string | null;
  /** Data mínima até a qual o documento deve permanecer válido. */
  requiredUntil?: Date | string | null;
  evidence?: EvidenciaDocumento | null;
}

export interface ResultadoElegibilidade {
  eligible: boolean;
  missing: string[];
  expired: string[];
  pendingReview: string[];
}

function normalizar(valor: string | null | undefined) {
  return (valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function aplicaAoPapel(requirementRole: string | null | undefined, employeeRole: string | null | undefined) {
  if (!requirementRole) return true;
  const requerido = normalizar(requirementRole);
  const atual = normalizar(employeeRole);
  return atual.includes(requerido) || requerido.includes(atual);
}

/**
 * Decide se um recurso pode ser mobilizado. Documento manual só vale após
 * revisão; evidência automática (ASO/treinamento/EPI) já nasce verificável.
 */
export function avaliarElegibilidadeDocumental(
  requirements: RequisitoElegibilidade[],
  employeeRole?: string | null,
  now = new Date(),
): ResultadoElegibilidade {
  const missing: string[] = [];
  const expired: string[] = [];
  const pendingReview: string[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (const requirement of requirements) {
    if (requirement.blocking === false || !aplicaAoPapel(requirement.role, employeeRole)) continue;
    const evidence = requirement.evidence;
    if (!evidence?.exists) {
      missing.push(requirement.name);
      continue;
    }
    const requiredUntil = requirement.requiredUntil ? new Date(requirement.requiredUntil) : today;
    requiredUntil.setHours(0, 0, 0, 0);
    if (evidence.expiresAt && new Date(evidence.expiresAt) < requiredUntil) {
      expired.push(requirement.name);
      continue;
    }
    if (evidence.source !== "automatico" && evidence.status !== "aprovado") {
      pendingReview.push(requirement.name);
    }
  }

  return {
    eligible: missing.length === 0 && expired.length === 0 && pendingReview.length === 0,
    missing,
    expired,
    pendingReview,
  };
}
