import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { Button } from './button.js'
import { t } from '../data/i18n.js'
import { portalManager } from '../data/portal_manager.js'
import { gamePrices } from '../data/game_prices.js'
import { config } from '../data/config.js'
import { player } from '../data/player.js'

const DIALOG_CONFIG = {
  height: 250,
  marginLeft: 50,
  marginRight: 50,
  marginTop: 50,
  marginBottom: 50,
  imageWidth: 350,
  borderTopWidth: 3,
  closeButtonSize: 40,
  fontSize: 20
}

export class PortalDialog {
  constructor(app, container) {
    this.app = app
    this.container = container
    this.dialogContainer = null
    this.textContainer = null
    this.onConfirmCallback = null
    this.onCancelCallback = null
  }

  show(portalId, onConfirm, onCancel = null) {
    this.onConfirmCallback = onConfirm
    this.onCancelCallback = onCancel

    const portal = portalManager.getPortal(portalId)
    const isPremium = portal?.type === 'premium'
    const cost = isPremium ? gamePrices.getPremiumPortalCost() : (config.portalCost || 200)
    const playerGold = player.gold || 0
    const playerCrystals = player.crystals || 0
    const currencyName = isPremium ? 'кристаллов' : 'золота'
    
    const title = isPremium ? t('portal.title_premium') : t('portal.title_random')
    const message = isPremium
      ? t('portal.confirm_premium', { cost })
      : t('portal.confirm_random', { cost })
    
    const fullText = `${title}\n\n${message}\n\nНужно: ${cost} ${currencyName}\nУ вас: ${isPremium ? playerCrystals : playerGold} ${currencyName}`

    // Загружаем изображение героя (заглушка - используем спрайт портала)
    let heroTexture = null
    try {
      heroTexture = PIXI.Assets.get('img/portal.png')
    } catch (e) {
      // Если нет, оставляем null
    }
    
    this.createDialog(heroTexture, fullText, portalId)
  }

  createDialog(heroImage, text, portalId) {
    // Удаляем старый диалог
    this.hide()

    this.dialogContainer = new PIXI.Container()
    this.dialogContainer.zIndex = 20000
    this.dialogContainer.sortableChildren = true
    
    // Overlay
    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 0.3)
    overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    overlay.endFill()
    overlay.eventMode = 'static'
    overlay.on('pointerdown', (e) => e.stopPropagation())
    this.dialogContainer.addChild(overlay)

    // Фон диалога
    const bg = new PIXI.Graphics()
    const screenWidth = this.app.screen.width
    const y = this.app.screen.height - DIALOG_CONFIG.height

    bg.beginFill(0xF5E7CF)
    bg.drawRect(0, y, screenWidth, DIALOG_CONFIG.height)
    bg.endFill()

    bg.lineStyle(DIALOG_CONFIG.borderTopWidth, 0x8c1300)
    bg.moveTo(0, y)
    bg.lineTo(screenWidth, y)

    this.dialogContainer.addChild(bg)

    // Кнопка закрытия (крестик)
    const closeBtn = new Button('✕', {
      width: DIALOG_CONFIG.closeButtonSize,
      height: DIALOG_CONFIG.closeButtonSize,
      color: colors.ui.button.reset,
      fontSize: 20,
      app: this.app,
      onClick: () => this.hide()
    })
    closeBtn.setX(screenWidth - DIALOG_CONFIG.closeButtonSize / 2 - 20)
    closeBtn.setY(y + DIALOG_CONFIG.closeButtonSize / 2 + 10)
    this.dialogContainer.addChild(closeBtn)

    // Картинка героя слева
    if (heroImage) {
      const hero = new PIXI.Sprite(heroImage)
      hero.anchor.set(0.5, 0.5)
      const targetWidth = DIALOG_CONFIG.imageWidth
      const scale = targetWidth / hero.texture.width
      hero.scale.set(scale)
      hero.x = DIALOG_CONFIG.marginLeft + targetWidth / 2
      hero.y = y + DIALOG_CONFIG.height / 2
      this.dialogContainer.addChild(hero)
    }

    // Контейнер для текста
    this.textContainer = new PIXI.Container()
    this.textContainer.x = DIALOG_CONFIG.marginLeft + DIALOG_CONFIG.imageWidth + DIALOG_CONFIG.marginLeft
    this.textContainer.y = y + DIALOG_CONFIG.marginTop
    this.dialogContainer.addChild(this.textContainer)

    // Текст
    const textObj = new PIXI.Text(text, {
      fontFamily: FONT,
      fontSize: 20,
      fill: '#333333',
      wordWrap: true,
      wordWrapWidth: this.app.screen.width - DIALOG_CONFIG.marginLeft * 3 - DIALOG_CONFIG.imageWidth - DIALOG_CONFIG.marginRight - 50
    })
    textObj.x = 0
    textObj.y = 0
    this.textContainer.addChild(textObj)

    // Кнопки "Продолжить" и "Отмена"
    const btnY = textObj.height + 30
    const btnSpacing = 150

    const continueBtn = new Button(t('ui.continue'), {
      width: 140,
      height: 45,
      color: colors.ui.button.continue,
      fontSize: 18,
      app: this.app,
      onClick: () => {
        this.hide()
        if (this.onConfirmCallback) {
          this.onConfirmCallback(portalId)
        }
      }
    })
    continueBtn.x = btnSpacing
    continueBtn.y = btnY
    this.textContainer.addChild(continueBtn)

    const cancelBtn = new Button(t('ui.cancel'), {
      width: 140,
      height: 45,
      color: colors.ui.button.cancel,
      fontSize: 18,
      app: this.app,
      onClick: () => {
        this.hide()
        if (this.onCancelCallback) {
          this.onCancelCallback()
        }
      }
    })
    cancelBtn.x = btnSpacing + 160
    cancelBtn.y = btnY
    this.textContainer.addChild(cancelBtn)

    // Центрируем кнопки по вертикали
    const totalHeight = Math.max(textObj.height + btnY + 60, DIALOG_CONFIG.height - DIALOG_CONFIG.marginTop - DIALOG_CONFIG.marginBottom)
    this.textContainer.y = y + (DIALOG_CONFIG.height - DIALOG_CONFIG.marginTop - DIALOG_CONFIG.marginBottom - totalHeight) / 2

    this.container.addChild(this.dialogContainer)
  }

  hide() {
    if (this.dialogContainer) {
      this.container.removeChild(this.dialogContainer)
      this.dialogContainer.destroy({ children: true })
      this.dialogContainer = null
    }
  }
}
