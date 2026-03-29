import type { Alert } from '../types/Alert'
import type { Config } from '../types/Config'

/**
 * Transformiert NINA API Alerts und wendet Config-Filter an.
 * @param alerts - Rohes Alert-Array von der NINA API
 * @param config - Module-Konfiguration mit Filtern und Einstellungen
 * @param cityName - Gemeindename fuer den AGS-Code (oder null)
 * @returns Gefilterte und angereicherte Alerts mit Stadt-Namen
 */
export function transformNinaAlerts(alerts: Alert[], config: Config, cityName: string | null): Alert[] {
  const now = new Date(Date.now()).getTime()

  const filtered = alerts.filter((alert) => {
    if (config.hideCancelledWarnings && alert.payload.data.msgType === 'Cancel') {
      return false
    }

    return (
      (now - Date.parse(alert.sent)) / (1000 * 60 * 60) <= config.maxAgeInHours &&
      !config.excludeProviders.includes(alert?.payload?.data?.provider)
    )
  })

  return filtered.map((alert) => {
    if (alert?.payload?.data?.provider?.toLocaleLowerCase() === 'lhp' && config.downgradeLhpSeverity) {
      alert.payload.data.severity = 'Moderate'
    }

    if (alert.payload.data.msgType === 'Cancel' && config.downgradeCancelSeverity) {
      alert.payload.data.severity = 'Cancel'
    }

    alert.cityNames = cityName ? [cityName] : []

    return alert
  })
}

/**
 * Sortiert Alerts nach Schweregrad (falls konfiguriert).
 * @param alerts - Alert-Array
 * @param config - Konfiguration mit orderBySeverity-Flag
 * @returns Sortierte Alerts (Severe > Moderate > Minor > Cancel) oder unveränderte Liste
 */
export function orderBySeverity(alerts: Alert[], config: Config): Alert[] {
  if (config.orderBySeverity) {
    const severityOrder = ['Severe', 'Moderate', 'Minor', 'Cancel']

    return alerts.sort(
      (a, b) => severityOrder.indexOf(a.payload.data.severity) - severityOrder.indexOf(b.payload.data.severity)
    )
  }

  return alerts
}

/**
 * Dedupliziert Alerts basierend auf ID und/oder Titel.
 * @param alerts - Alert-Array
 * @param config - Konfiguration mit mergeAlertsById/Title-Flags
 * @returns Gefilterte Alerts mit zusammengefassten Stadt-Namen
 */
export function removeDuplicates(alerts: Alert[], config: Config): Alert[] {
  const knownIds: string[] = []
  const knownTitles: string[] = []

  return alerts.filter((alert) => {
    if (config.mergeAlertsById) {
      if (knownIds.includes(alert.id)) {
        const existing = alerts.find((existingAlert) => existingAlert.id === alert.id)
        if (existing) {
          existing.cityNames = [...new Set([...existing.cityNames, ...alert.cityNames])]
        }
        return false
      }
      knownIds.push(alert.id)
    }

    if (config.mergeAlertsByTitle) {
      const alertTitle = alert.i18nTitle.de
      if (alertTitle && knownTitles.includes(alertTitle)) {
        const existing = alerts.find((existingAlert) => existingAlert.i18nTitle.de === alertTitle)
        if (existing) {
          existing.cityNames = [...new Set([...existing.cityNames, ...alert.cityNames])]
        }
        return false
      }
      if (alertTitle) {
        knownTitles.push(alertTitle)
      }
    }

    return true
  })
}
