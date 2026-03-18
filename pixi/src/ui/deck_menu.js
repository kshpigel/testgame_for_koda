import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { CARD_CONFIG } from './card.js'
import { Card } from './card.js'
import { Circle } from './circle.js'
import { soundManager } from '../audio/sound_manager.js'

export class DeckMenu {
  constructor(app, currentDeck, cardTypes, assets, container) {
    this.app = app
    this.currentDeck = currentDeck
    this.cardTypes = cardTypes
    this.assets = assets
    this.container = container
  }
  
  show() {
    const menuContainer = new PIXI.Container()
    menuContainer.x = this.app.screen.width / 2
    menuContainer.y = this.app.screen.height / 2
    
    // Затемнение фона
    const overlay = new PIXI.Graphics()
    overlay.beginFill(colors.ui.text.primary, 0.8)
    overlay.drawRect(-this.app.screen.width/2, -this.app.screen.height/2, this.app.screen.width, this.app.screen.height)
    overlay.endFill()
    menuContainer.addChild(overlay)
    
    // Панель меню
    const panelW = 660
    const panelH = 550
    const panel = new PIXI.Graphics()
    panel.beginFill(colors.ui.panel.bg)
    panel.lineStyle(3, colors.ui.panel.border)
    panel.drawRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 20)
    panel.endFill()
    menuContainer.addChild(panel)
    
    // Заголовок
    const title = new PIXI.Text('Колода', {
      fontFamily: FONT,
      fontSize: 28,
      fontWeight: 'bold',
      fill: colors.ui.text.primary
    })
    title.anchor.set(0.5)
    title.y = -panelH/2 + 30
    menuContainer.addChild(title)
    
    // Кнопка закрытия
    const closeBtn = new PIXI.Container()
    closeBtn.x = panelW/2 - 30
    closeBtn.y = -panelH/2 + 30
    closeBtn.eventMode = 'static'
    closeBtn.cursor = 'pointer'
    
    const closeX = new PIXI.Text('✕', {
      fontFamily: FONT,
      fontSize: 24,
      fill: '#ff6666'
    })
    closeBtn.addChild(closeX)
    
    closeBtn.on('pointerdown', () => {
      soundManager.play('click')
      this.container.removeChild(menuContainer)
    })
    menuContainer.addChild(closeBtn)
    
    // Подсчёт количества каждого типа карты
    const cardCounts = {}
    this.currentDeck.forEach(card => {
      cardCounts[card.type] = (cardCounts[card.type] || 0) + 1
    })
    
    // Сетка карт
    const cardScale = 0.8
    const cardW = CARD_CONFIG.width * cardScale
    const cardH = CARD_CONFIG.height * cardScale
    const startX = -panelW/2 + 60
    const startY = -panelH/2 + 110
    const cols = 6
    const spacingX = 8
    const spacingY = 8
    
    const allCardTypes = this.cardTypes.filter(ct => this.currentDeck.some(d => d.type === ct.type))
    
    allCardTypes.forEach((cardType, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      
      const card = new Card(cardType, { 
        width: cardW, 
        height: cardH 
      })
      
      card.x = startX + col * (cardW + spacingX) + cardW/2
      card.y = startY + row * (cardH + spacingY) + cardH/2
      card.scale.set(cardScale)
      
      const count = cardCounts[cardType.type] || 0
      if (count === 0) {
        card.setDisabled(true)
      }
      
      if (this.assets && this.assets[`card_bg_${cardType.type}`]) {
        card.loadBgImage(this.assets[`card_bg_${cardType.type}`].texture)
      }
      if (this.assets && this.assets[`card_${cardType.type}`]) {
        card.loadHeroImage(this.assets[`card_${cardType.type}`].texture)
      }
      
      const countCircle = new Circle({
        x: cardW/2 - 5,
        y: -cardH/2 + 10,
        radius: 12,
        bgColor: colors.ui.circle.bg,
        borderColor: colors.ui.circle.border,
        text: `${count}`,
        fontSize: 12
      })
      card.addChild(countCircle)
      
      menuContainer.addChild(card)
    })
    
    // Статистика
    const statsText = new PIXI.Text(`Всего карт: ${this.currentDeck.length} | В руке: ${this.cardsInHand || 0}`, {
      fontFamily: FONT,
      fontSize: 18,
      fill: '#aaaaaa'
    })
    statsText.anchor.set(0.5)
    statsText.y = panelH/2 - 40
    menuContainer.addChild(statsText)
    
    // Закрытие по клику вне панели
    overlay.eventMode = 'static'
    overlay.on('pointerdown', () => {
      this.container.removeChild(menuContainer)
    })
    
    this.container.addChild(menuContainer)
  }
}
