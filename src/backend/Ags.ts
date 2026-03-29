/**
 * Wandelt einen 12-stelligen AGS in die Dashboard-Query-Form um.
 * @param ags - 12-stelliger AGS-Code
 * @returns Dashboard-AGS mit den ersten 5 Stellen und 7 Nullen
 */
export function toDashboardAgs(ags: string): string {
  return `${ags.substring(0, 5)}0000000`
}

/**
 * Validiert AGS-Eingaben auf das 12-stellige Regionalschluessel-Format.
 * @param ags - AGS als String
 * @returns 12-stelliger AGS oder null bei ungueltigem Format
 */
export function normalizeAgs(ags: string): string | null {
  const trimmed = ags.trim()
  return /^\d{12}$/.test(trimmed) ? trimmed : null
}
