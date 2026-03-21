import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { CARD_CONFIG } from './card.js'
import { Button } from './button.js'
import { Circle } from './circle.js'
import { DeckDisplay } from './deck_display.js'
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
    this.deckDisplay = null
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
    this.deckDisplay = new DeckDisplay(this.app, this.assets, currentDeckLength, onDeckClick)
    // TODO: настроить позицию - сейчас по центру
    this.deckDisplay.setX(1450)
    this.deckDisplay.setY(700)
    this.deckDisplay.zIndex = 1000
    this.container.addChild(this.deckDisplay)
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
    if (this.deckDisplay) {
      this.deckDisplay.updateDeckCount(count)
    }
  }
  
  setBlocked(blocked) {
    if (this.playBtn) this.playBtn.setDisabled(blocked)
    if (this.resetBtn) this.resetBtn.setDisabled(blocked)
    if (this.deckDisplay) {
      this.deckDisplay.setBlocked(blocked)
    }
  }
  
  update() {
    // deckDisplay обрабатывает свою анимацию через UINode ticker
  }
}
