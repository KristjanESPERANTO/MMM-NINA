import * as NodeHelper from 'node_helper'
import * as Log from 'logger'
import { Config } from '../types/Config'
import { Alert } from '../types/Alert'
import { transformNinaAlerts, orderBySeverity, removeDuplicates } from './Utils'

/**
 * Wandelt einen 12-stelligen AGS in die Dashboard-Query-Form um.
 * @param ags - 12-stelliger AGS-Code
 * @returns Dashboard-AGS mit den ersten 5 Stellen und 7 Nullen
 */
function toDashboardAgs(ags: string): string {
  return `${ags.substring(0, 5)}0000000`
}

/**
 * Validiert AGS-Eingaben auf das 12-stellige Regionalschluessel-Format.
 * @param ags - AGS als String
 * @returns 12-stelliger AGS oder null bei ungueltigem Format
 */
function normalizeAgs(ags: string): string | null {
  const trimmed = ags.trim()
  return /^\d{12}$/.test(trimmed) ? trimmed : null
}

/**
 * Validiert AGS-Eingaben und liefert nur gueltige 12-stellige Werte.
 * @param rawAgs - Urspruengliche AGS-Eingaben aus der Konfiguration
 * @returns Liste aus Originalwert und validiertem 12-stelligen AGS
 */
function getValidAgsEntries(rawAgs: string[]): { raw: string; normalized: string }[] {
  const validAgs: { raw: string; normalized: string }[] = []

  for (const raw of rawAgs) {
    if (raw.trim().length === 8) {
      Log.warn(
        `AGS '${raw}' ist 8-stellig und wird nicht mehr unterstützt. ` +
          `Bitte den 12-stelligen Regionalschlüssel verwenden.`
      )
      continue
    }

    const normalized = normalizeAgs(raw)
    if (!normalized) {
      Log.warn(`Ungültiger AGS '${raw}'. Erlaubt sind nur 12-stellige numerische Werte als String.`)
      continue
    }

    validAgs.push({ raw, normalized })
  }

  return validAgs
}

module.exports = NodeHelper.create({
  start() {
    Log.log(`${this.name} helper method started...`)
  },

  async socketNotificationReceived(notification: string, payload: unknown) {
    if (notification === 'NINA_ALERTS_REQUEST') {
      const alerts: Alert[] = []
      const { config, identifier } = payload as { config: Config; identifier: string }

      const rawAgs = Array.isArray(config.ags) ? config.ags : [config.ags]
      const validAgs = getValidAgsEntries(rawAgs)

      const responses = await Promise.all(
        validAgs.map(({ normalized }) =>
          fetch(`https://warnung.bund.de/api31/dashboard/${toDashboardAgs(normalized)}.json`)
            .then((r) => r.json())
            .catch((e: Error) => e)
        )
      )

      for (const [i, response] of responses.entries()) {
        if (response instanceof Error) {
          Log.warn(`API request for ${validAgs[i].raw} failed:`, response.message)
        } else {
          alerts.push(...transformNinaAlerts(response, config, validAgs[i].normalized))
        }
      }

      this.sendSocketNotification('NINA_ALERTS_RESPONSE', {
        alerts: removeDuplicates(orderBySeverity(alerts, config), config),
        identifier
      })
    } else {
      Log.warn(`${notification} is invalid notification`)
    }
  }
})
