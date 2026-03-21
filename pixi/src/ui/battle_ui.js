import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { CARD_CONFIG } from './card.js'
import { Button } from './button.js'
import { Circle } from './circle.js'
import { soundManager } from '../audio/sound_manager.js'

export class BattleUI {
  constructor(app, container, assets) {
    this.app = app
    this.container = container
    this.assets = assets
    
    this.playBtn = null
    this.resetBtn = null
    this.stepsText = null
    this.resetsText = null
    this.deckContainer = null
    this.deckCountCircle = null
  }
  
  render(cntSteps, cntReset, currentDeckLength, onPlay, onReset, onDeckClick) {
    this.renderControls(cntSteps, cntReset, onPlay, onReset)
    this.renderDeckInfo(currentDeckLength, onDeckClick)
  }
  
  renderControls(cntSteps, cntReset, onPlay, onReset) {
    const btnY = this.app.screen.height - 60
    
    // Кнопка "Ход"
    this.playBtn = new Button('Сделать ход!', {
      width: 140,
      height: 50,
      color: colors.ui.button.play,
      fontSize: 18,
      app: this.app,
      onClick: onPlay
    })
    this.playBtn.setX(this.app.screen.width / 2 - 100)
    this.playBtn.setY(btnY)
    this.container.addChild(this.playBtn)
    
    // Кнопка "Сброс"
    this.resetBtn = new Button('Сброс', {
      width: 140,
      height: 50,
      color: colors.ui.button.reset,
      fontSize: 18,
      app: this.app,
      onClick: onReset
    })
    this.resetBtn.setX(this.app.screen.width / 2 + 100)
    this.resetBtn.setY(btnY)
    this.container.addChild(this.resetBtn)
    
    // Счетчики
    const infoStyle = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 20,
      fill: colors.ui.text.primary
    })
    
    this.stepsText = new PIXI.Text(`Ходы: ${cntSteps}`, infoStyle)
    this.stepsText.anchor.set(0.5)
    this.stepsText.x = this.app.screen.width / 2 + 70
    this.stepsText.y = btnY - 50
    this.container.addChild(this.stepsText)
    
    this.resetsText = new PIXI.Text(`Сбросы: ${cntReset}`, infoStyle)
    this.resetsText.anchor.set(0.5)
    this.resetsText.x = this.app.screen.width / 2 - 80
    this.resetsText.y = btnY - 50
    this.container.addChild(this.resetsText)
  }
  
  renderDeckInfo(currentDeckLength, onDeckClick) {
    const cardW = CARD_CONFIG.width
    const cardH = CARD_CONFIG.height
    
    this.deckContainer = new PIXI.Container()
    this.deckContainer.x = this.app.screen.width - cardW - 30
    this.deckContainer.y = this.app.screen.height - cardH - 40
    this.deckContainer.eventMode = 'static'
    this.deckContainer.cursor = 'pointer'
    
    const cardBack = new PIXI.Graphics()
    cardBack.lineStyle(2, colors.ui.cardBack.borderNormal)
    cardBack.beginFill(colors.ui.cardBack.normal)
    cardBack.drawRoundedRect(0, 0, cardW, cardH, 8)
    cardBack.endFill()
    this.deckContainer.addChild(cardBack)
    
    if (this.assets && this.assets.cardBack && this.assets.cardBack.texture) {
      const backSprite = new PIXI.Sprite(this.assets.cardBack.texture)
      backSprite.width = cardW
      backSprite.height = cardH
      this.deckContainer.addChild(backSprite)
    }
    
    // Счётчик карт в колоде
    this.deckCountCircle = new Circle({
      x: cardW / 2 + 3,
      y: cardH - 10,
      radius: 22,
      bgColor: colors.card.circle.normal,
      borderColor: colors.card.circle.border,
      text: `${currentDeckLength}`
    })
    this.deckContainer.addChild(this.deckCountCircle)
    
    // Подпись "Колода"
    const deckLabel = new PIXI.Text('Колода', {
      fontFamily: FONT,
      fontSize: 14,
      fill: '#aaaaaa'
    })
    deckLabel.anchor.set(0.5)
    deckLabel.x = cardW / 2
    deckLabel.y = cardH + 20
    this.deckContainer.addChild(deckLabel)
    
    // Анимация при наведении
    this.deckContainer.on('pointerover', () => {
      this.deckContainer.targetScale = 1.05
      cardBack.clear()
      cardBack.lineStyle(2, colors.ui.cardBack.borderHover)
      cardBack.beginFill(colors.ui.cardBack.hover)
      cardBack.drawRoundedRect(0, 0, cardW, cardH, 8)
      cardBack.endFill()
    })
    
    this.deckContainer.on('pointerout', () => {
      this.deckContainer.targetScale = 1
      cardBack.clear()
      cardBack.lineStyle(2, colors.ui.cardBack.borderNormal)
      cardBack.beginFill(colors.ui.cardBack.normal)
      cardBack.drawRoundedRect(0, 0, cardW, cardH, 8)
      cardBack.endFill()
    })
    
    this.deckContainer.on('pointerdown', () => {
      soundManager.play('click')
      onDeckClick()
    })
    
    this.container.addChild(this.deckContainer)
  }
  
  updateSteps(cntSteps) {
    if (this.stepsText) {
      this.stepsText.text = `Ходы: ${cntSteps}`
    }
  }
  
  updateResets(cntReset) {
    if (this.resetsText) {
      this.resetsText.text = `Сбросы: ${cntReset}`
    }
  }
  
  updateDeckCount(count) {
    if (this.deckCountCircle) {
      this.deckCountCircle.setText(`${count}`)
    }
  }
  
  setBlocked(blocked) {
    if (this.playBtn) this.playBtn.setDisabled(blocked)
    if (this.resetBtn) this.resetBtn.setDisabled(blocked)
    if (this.deckContainer) {
      this.deckContainer.eventMode = blocked ? 'none' : 'static'
      this.deckContainer.cursor = blocked ? 'default' : 'pointer'
    }
  }
  
  update() {
    if (this.deckContainer && this.deckContainer.targetScale !== undefined) {
      const diff = this.deckContainer.targetScale - this.deckContainer.scale.x
      if (Math.abs(diff) > 0.001) {
        this.deckContainer.scale.set(this.deckContainer.scale.x + diff * 0.15)
      }
    }
  }
}
