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
    const cardW = CARD_CONFIG.width
    const cardH = CARD_CONFIG.height
    const startX = -330 // center - 50px
    const startY = -150 // +40px вниз
    const cols = 6
    const spacingX = 8
    const spacingY = 8
    
    // Показываем ВСЕ типы карт (даже с count=0)
    const allCardTypes = this.cardTypes
    
    allCardTypes.forEach((cardType, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      
      const count = cardCounts[cardType.type] || 0
      
      const card = new Card(cardType, { 
        width: cardW, 
        height: cardH,
        scale: cardScale
      })
      
      card.x = startX + col * (cardW * cardScale + spacingX) + cardW * cardScale / 2
      card.y = startY + row * (cardH * cardScale + spacingY) + cardH * cardScale / 2
      
      // Если карт этого типа нет - полупрозрачность и count = 0
      if (count === 0) {
        card.alpha = 0.4
      }
      
      // Обработчик клика - открыть детальное окно
      card.eventMode = 'static'
      card.cursor = 'pointer'
      card.on('pointerdown', () => {
        this.showCardDetails(cardType, count)
      })
      
      if (this.assets && this.assets[`card_bg_${cardType.type}`]) {
        card.loadBgImage(this.assets[`card_bg_${cardType.type}`].texture)
      }
      if (this.assets && this.assets[`card_${cardType.type}`]) {
        card.loadHeroImage(this.assets[`card_${cardType.type}`].texture)
      }
      
      const countCircle = new Circle({
        x: cardW * cardScale / 2 - 5,
        y: -cardH * cardScale / 2 + 10,
        radius: 12,
        bgColor: count === 0 ? colors.ui.circle.bg : colors.ui.circle.border,
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
  
  showCardDetails(cardType, count) {
    // Создаём детальное модальное окно
    const detailModal = new Modal(this.app, {
      title: cardType.name || 'Карта',
      width: 400,
      height: 350,
      showCloseButton: true
    })
    
    // Контент
    const detailContent = new PIXI.Container()
    
    // Большая карта
    const cardScale = 1.2
    const cardW = CARD_CONFIG.width
    const cardH = CARD_CONFIG.height
    
    const card = new Card(cardType, {
      width: cardW,
      height: cardH,
      scale: cardScale
    })
    card.x = 0
    card.y = -30
    
    if (this.assets && this.assets[`card_bg_${cardType.type}`]) {
      card.loadBgImage(this.assets[`card_bg_${cardType.type}`].texture)
    }
    if (this.assets && this.assets[`card_${cardType.type}`]) {
      card.loadHeroImage(this.assets[`card_${cardType.type}`].texture)
    }
    
    detailContent.addChild(card)
    
    // Описание
    const descText = new PIXI.Text(cardType.description || 'Описание отсутствует', {
      fontFamily: FONT,
      fontSize: 16,
      fill: colors.ui.text.primary,
      wordWrap: true,
      wordWrapWidth: 350,
      align: 'center'
    })
    descText.anchor.set(0.5)
    descText.y = 120
    detailContent.addChild(descText)
    
    // Количество в колоде
    const countText = new PIXI.Text(`В колоде: ${count}`, {
      fontFamily: FONT,
      fontSize: 18,
      fill: colors.ui.text.secondary
    })
    countText.anchor.set(0.5)
    countText.y = 160
    detailContent.addChild(countText)
    
    detailModal.setContent(() => detailContent)
    detailModal.show()
    
    // Добавляем поверх текущего модального окна
    this.modal.container.addChild(detailModal.container)
  }
}
