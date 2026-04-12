import * as PIXI from 'pixi.js'
import { log } from '../data/config.js'

export class PortalManager {
  constructor() {
    this.portalsData = null
    this.portalTypes = null
    this.altarTypes = null
    this.positions = null
  }

  async load() {
    try {
      const data = await PIXI.Assets.load('/assets/data/portals.json')
      this.portalsData = new Map()
      this.portalTypes = data.portalTypes || {}
      this.altarTypes = data.altarTypes || {}
      this.positions = data.positions || []

      data.portals.forEach(p => {
        this.portalsData.set(p.id, p)
      })

      log('[PortalManager] loaded', this.portalsData.size, 'portals')
      return true
    } catch (e) {
      console.error('[PortalManager] failed to load:', e)
      return false
    }
  }

  getPortal(id) {
    return this.portalsData?.get(id) || null
  }

  getPortalType(id) {
    const portal = this.getPortal(id)
    return portal?.type || 'random'
  }

  getPortalConfig(id) {
    const type = this.getPortalType(id)
    return this.portalTypes[type] || null
  }

  getAltarConfig(altarType) {
    if (!altarType) return null
    return this.altarTypes[altarType] || null
  }

  getPosition(id) {
    return this.positions.find(p => p.id === id) || null
  }

  getAllPortals() {
    return Array.from(this.portalsData?.values() || [])
  }

  updatePortalStatus(id, status) {
    const portal = this.getPortal(id)
    if (portal) {
      portal.status = status
      if (status === 'active') {
        portal.lastWinTime = null
      }
    }
  }

  markPortalCompleted(id) {
    const portal = this.getPortal(id)
    if (portal) {
      portal.lastWinTime = Date.now()
      portal.status = 'locked'
      log('[PortalManager] marked', id, 'as completed, lastWinTime:', portal.lastWinTime)
    }
  }

  isPortalAvailable(id) {
    const portal = this.getPortal(id)
    if (!portal) return false

    if (portal.status === 'active') return true
    if (portal.type === 'premium' || portal.type === 'pvp') return true

    if (portal.lastWinTime === null) {
      if (portal.unlockDelayMinutes) {
        const now = Date.now()
        const unlockTime = portal.unlockDelayMinutes * 60 * 1000
        return now >= unlockTime
      }
      return false
    }

    const now = Date.now()
    const growthTime = portal.growthTimeMinutes * 60 * 1000
    const nextAvailable = portal.lastWinTime + growthTime

    return now >= nextAvailable
  }

  getTimeUntilAvailable(id) {
    const portal = this.getPortal(id)
    if (!portal || portal.status === 'active') return 0

    if (portal.lastWinTime === null) {
      if (portal.unlockDelayMinutes) {
        const now = Date.now()
        const unlockTime = portal.unlockDelayMinutes * 60 * 1000
        return Math.max(0, unlockTime - now)
      }
      return 0
    }

    const now = Date.now()
    const growthTime = portal.growthTimeMinutes * 60 * 1000
    const nextAvailable = portal.lastWinTime + growthTime

    return Math.max(0, nextAvailable - now)
  }

  getPortalStatus(id) {
    const portal = this.getPortal(id)
    if (!portal) return 'unknown'

    if (portal.status === 'active') return 'active'
    if (portal.type === 'premium' || portal.type === 'pvp') return 'active'

    if (this.isPortalAvailable(id)) return 'active'
    return portal.status
  }
}

export const portalManager = new PortalManager()
