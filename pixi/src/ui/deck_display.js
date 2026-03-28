import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { CARD_CONFIG } from './card.js'
import { Circle } from './circle.js'
import { UINode } from './ui_node.js'
import { soundManager } from '../audio/sound_manager.js'
import { t } from '../data/i18n.js'

export class DeckDisplay extends UINode {
  constructor(app, assets, currentDeckLength, onDeckClick) {
    const cardW = CARD_CONFIG.width
    const cardH = CARD_CONFIG.height
    
    super({
      width: cardW,
      height: cardH + 40,
      app: app,
      scaleSpeed: 0.15
    })
    
    this.assets = assets
    this.onDeckClick = onDeckClick
    
    this.create(cardW, cardH, currentDeckLength)
    this.updateDebug()
  }
  
  create(cardW, cardH, currentDeckLength) {
    // Смещение от центра (благодаря pivot)
    const offsetX = -cardW / 2
    const offsetY = -cardH / 2
    
    // Обратная сторона карты
    const cardBack = new PIXI.Graphics()
    cardBack.name = 'cardBack'
    cardBack.lineStyle(2, colors.ui.cardBack.borderNormal)
    cardBack.beginFill(colors.ui.cardBack.normal)
    cardBack.drawRoundedRect(offsetX, offsetY, cardW, cardH, 8)
    cardBack.endFill()
    this.addChild(cardBack)
    
    if (this.assets && this.assets.cardBack && this.assets.cardBack.texture) {
      const backSprite = new PIXI.Sprite(this.assets.cardBack.texture)
      backSprite.x = offsetX
      backSprite.y = offsetY
      backSprite.width = cardW
      backSprite.height = cardH
      this.addChild(backSprite)
    }
    
    // Счётчик карт в колоде
    this.deckCountCircle = new Circle({
      x: offsetX + cardW / 2 + 3,
      y: offsetY + cardH - 10,
      radius: 22,
      bgColor: colors.card.circle.normal,
      borderColor: colors.card.circle.border,
      text: `${currentDeckLength}`,
      app: this._app
    })
    this.addChild(this.deckCountCircle)
    
    // Подпись "Колода"
    const deckLabel = new PIXI.Text(t('castle.deck'), {
      fontFamily: FONT,
      fontSize: 14,
      fill: '#aaaaaa'
    })
    deckLabel.anchor.set(0.5)
    deckLabel.x = offsetX + cardW / 2
    deckLabel.y = offsetY + cardH + 20
    this.addChild(deckLabel)
    
    // Интерактивность
    this.eventMode = 'static'
    this.cursor = 'pointer'
    
    this.on('pointerover', () => {
      this.setScale(1.05)
      cardBack.clear()
      cardBack.lineStyle(2, colors.ui.cardBack.borderHover)
      cardBack.beginFill(colors.ui.cardBack.hover)
      cardBack.drawRoundedRect(offsetX, offsetY, cardW, cardH, 8)
      cardBack.endFill()
    })
    
    this.on('pointerout', () => {
      this.setScale(1)
      cardBack.clear()
      cardBack.lineStyle(2, colors.ui.cardBack.borderNormal)
      cardBack.beginFill(colors.ui.cardBack.normal)
      cardBack.drawRoundedRect(offsetX, offsetY, cardW, cardH, 8)
      cardBack.endFill()
    })
    
    this.on('pointerdown', () => {
      soundManager.play('click')
      if (this.onDeckClick) this.onDeckClick()
    })
  }
  
  updateDeckCount(count) {
    if (this.deckCountCircle) {
      this.deckCountCircle.setText(`${count}`)
    }
  }
  
  setBlocked(blocked) {
    this.eventMode = blocked ? 'none' : 'static'
    this.cursor = blocked ? 'default' : 'pointer'
  }
}
