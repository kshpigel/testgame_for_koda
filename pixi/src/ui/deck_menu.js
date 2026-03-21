import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { CARD_CONFIG } from './card.js'
import { Card } from './card.js'
import { Circle } from './circle.js'
import { Modal } from './modal.js'
import { soundManager } from '../audio/sound_manager.js'

export class DeckMenu {
  constructor(app, currentDeck, cardTypes, assets, container) {
    this.app = app
    this.currentDeck = currentDeck
    this.cardTypes = cardTypes
    this.assets = assets
    this.container = container
    
    // Создаём модальное окно (2/4 экрана по ширине)
    this.modal = new Modal(app, {
      title: 'Колода',
      width: app.screen.width * 0.5,
      height: 500
    })
  }
  
  show() {
    // Добавляем контент в модальное окно
    this.modal.setContent((content) => {
      this.renderContent(content)
    })
    
    this.modal.onClose = () => {
      this.container.removeChild(this.modal.container)
    }
    
    this.modal.show()
    this.container.addChild(this.modal.container)
  }
  
  renderContent(content) {
    // Подсчёт количества каждого типа карты
    const cardCounts = {}
    this.currentDeck.forEach(card => {
      cardCounts[card.type] = (cardCounts[card.type] || 0) + 1
    })
    
    // Сетка карт
    const cardScale = 0.8
    const cardW = CARD_CONFIG.width * cardScale
    const cardH = CARD_CONFIG.height * cardScale
    const startX = -330 // center - 50px
    const startY = -150 // +40px вниз
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
      
      content.addChild(card)
    })
    
    // Статистика
    const statsText = new PIXI.Text(`Всего карт: ${this.currentDeck.length} | В руке: ${this.cardsInHand || 0}`, {
      fontFamily: FONT,
      fontSize: 18,
      fill: colors.ui.text.secondary
    })
    statsText.anchor.set(0.5)
    statsText.y = 190 // +40px вверх
    content.addChild(statsText)
  }
}
