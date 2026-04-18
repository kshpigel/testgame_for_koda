import * as PIXI from 'pixi.js'
import { Dialog } from './dialog.js'
import { t } from '../data/i18n.js'
import { portalManager } from '../data/portal_manager.js'
import { config } from '../data/config.js'
import { player } from '../data/player.js'
import { colors } from '../data/colors.js'

export class PortalDialog {
  constructor(app, container) {
    this.app = app
    this.container = container
    this.dialog = new Dialog(app, container)
  }

  async show(portalId, onConfirm, onCancel = null) {
    const portal = portalManager.getPortal(portalId)
    const isPremium = portal?.type === 'premium'
    const cost = isPremium ? 200 : (config.portalCost || 200)
    const playerGold = player.gold || 0
    const playerCrystals = player.crystals || 0
    const currencyName = isPremium ? 'кристаллов' : 'золота'
    
    const title = isPremium ? t('portal.title_premium') : t('portal.title_random')
    const message = isPremium
      ? t('portal.confirm_premium', { cost })
      : t('portal.confirm_random', { cost })
    
    const fullText = `${title}\n\n${message}\n\nНужно: ${cost} ${currencyName}\nУ вас: ${isPremium ? playerCrystals : playerGold} ${currencyName}`

    // Загружаем изображение персонажа (helper)
    let heroTexture = null
    try {
      heroTexture = await PIXI.Assets.load('/assets/img/cards/helper.png')
    } catch (e) {
      console.warn('[PortalDialog] Failed to load helper.png:', e)
    }

    // Создаем кнопки
    const extraButtons = [
      {
        text: t('ui.cancel'),
        width: 120,
        height: 45,
        color: colors.ui.button.reset,
        fontSize: 18,
        onClick: () => {
          if (onCancel) onCancel()
        }
      },
      {
        text: t('ui.confirm'),
        width: 140,
        height: 45,
        color: colors.ui.button.continue,
        fontSize: 18,
        onClick: () => {
          if (onConfirm) onConfirm(portalId)
        }
      }
    ]

    // Используем Dialog с дополнительными кнопками
    this.dialog.show(heroTexture, fullText, null, extraButtons)
  }

  hide() {
    this.dialog.hide()
  }
}
