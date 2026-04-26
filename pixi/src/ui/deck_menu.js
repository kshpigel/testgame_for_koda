import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { config } from '../data/config.js'
import { getCardStyle } from '../data/card_styles.js'
import { CARD_CONFIG } from './card.js'
import { Card } from './card.js'
import { Circle } from './circle.js'
import { Modal } from './modal.js'
import { soundManager } from '../audio/sound_manager.js'
import { t } from '../data/i18n.js'

export class DeckMenu {
  constructor(app, currentDeck, cardTypes, assets, container) {
    this.app = app
    this.currentDeck = currentDeck
    this.cardTypes = cardTypes
    this.assets = assets
    this.container = container
    
    // Создаём модальное окно (2/4 экрана по ширине)
    this.modal = new Modal(app, {
      title: t('castle.deck'),
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
    // Очищаем предыдущий контент (если был)
    while (content.children.length > 0) {
      const child = content.children[0]
      content.removeChild(child)
      if (child.destroy) {
        child.destroy({ children: true })
      }
    }
    
    // Подсчёт количества каждого типа карты
    const cardCounts = {}
    this.currentDeck.forEach(card => {
      cardCounts[card.type] = (cardCounts[card.type] || 0) + 1
    })
    
    // Сетка карт
    const cardScale = 0.75
    const cardW = CARD_CONFIG.width
    const cardH = CARD_CONFIG.height
    
    // Центрируем по горизонтали: 6 колонок
    const cols = 6
    const totalWidth = cols * cardW * cardScale + (cols - 1) * 10 // gap 10px
    const startX = -totalWidth / 2 + cardW * cardScale / 2
    const startY = -130 // +20px вниз
    const spacingX = 10
    const spacingY = 8
    
    // Показываем ТОЛЬКО типы карт, которые есть в колоде (count > 0), сортируем по силе (value) по убыванию
    const allCardTypes = [...this.cardTypes].sort((a, b) => (b.value || 0) - (a.value || 0))
    const visibleCardTypes = allCardTypes.filter(cardType => (cardCounts[cardType.type] || 0) > 0)
    
    visibleCardTypes.forEach((cardType, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      
      const count = cardCounts[cardType.type] || 0
      
      const cardStyle = getCardStyle(cardType.style)
      
      const card = new Card(cardType, { 
        width: cardW, 
        height: cardH,
        scale: cardScale,
        style: cardStyle
      })
      
      card.x = startX + col * (cardW * cardScale + spacingX) + cardW * cardScale / 2
      card.y = startY + row * (cardH * cardScale + spacingY) + cardH * cardScale / 2
      
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
      
      // Кружок с количеством - внутри card (чтобы был поверх)
      const countCircle = new Circle({
        xRatio: 0.4,
        yRatio: -0.4,
        radius: 12,
        bgColor: colors.ui.circle.bg,
        borderColor: colors.ui.circle.border,
        text: `${count}`,
        fontSize: 12
      })
      countCircle.setDarkStyle()
      card.countCircle = countCircle
      card.addChild(countCircle)
      // Компенсируем scale карты (0.8)
      countCircle.scale.set(1 / cardScale)
      card.updateChildPositions()
      
      content.addChild(card)
    })
    
    // Статистика
    const statsText = new PIXI.Text(`${t('battle.cards_left')}: ${this.currentDeck.length} | ${t('battle.in_hand')}: ${this.cardsInHand || 0}`, {
      fontFamily: FONT,
      fontSize: 18,
      fill: colors.ui.text.secondary
    })
    statsText.anchor.set(0.5)
    statsText.y = 190 // +40px вверх
    content.addChild(statsText)
  }
  
  showCardDetails(cardType, count) {
    // Создаём детальное модальное окно (выше основного)
    const detailModal = new Modal(this.app, {
      title: cardType.name || 'Карта',
      width: 500,
      height: 350,
      showCloseButton: true
    })
    detailModal.container.zIndex = 20000
    
    // Константы для позиционирования (относительно центра content)
    const heroW = 200
    const heroH = heroW * 1.5
    const contentH = 320 // высота контента (350 - 30 заголовок)
    
    // Слева 30px: от центра -250 + 30 = -220
    const heroX = -220
    // По низу: от центра + (160 - 300) = -140
    const heroY = contentH / 2 - heroH - 16
    
    // Текст: отодвинуть от правого края на 30px
    // От центра 250 - 30 - 200(ширина текста) = 20
    const textX = 20
    const topY = -90 // отступ от заголовка
    
    // Картинка героя (слева) с бордером
    const heroContainer = new PIXI.Container()
    heroContainer.x = heroX
    heroContainer.y = heroY
    
    // Бордер (только в debug)
    if (config.debug) {
      const heroBorder = new PIXI.Graphics()
      heroBorder.lineStyle(1, 0xFF00FF, 1)
      heroBorder.drawRect(0, 0, heroW, heroW * 1.5)
      heroContainer.addChild(heroBorder)
    }
    
    if (this.assets && this.assets[`card_${cardType.type}`]) {
      const heroSprite = new PIXI.Sprite(this.assets[`card_${cardType.type}`].texture)
      heroSprite.anchor.set(0.5)
      heroSprite.width = heroW
      heroSprite.height = heroW * 1.5
      // Позиционируем по центру контейнера
      heroSprite.x = heroW / 2
      heroSprite.y = (heroW * 1.5) / 2
      heroContainer.addChild(heroSprite)
    }
    
    detailModal.content.addChild(heroContainer)
    
    // Текст блок - динамический размер
    // Биография (справа)
    const bioText = new PIXI.Text(cardType.bio || '', {
      fontFamily: FONT,
      fontSize: 14,
      fill: colors.ui.text.secondary,
      wordWrap: true,
      wordWrapWidth: 200,
      align: 'left',
      fontStyle: 'italic'
    })
    bioText.x = textX
    bioText.y = topY
    detailModal.content.addChild(bioText)
    
    // Механика (ниже биографии, динамически)
    const mechanicText = new PIXI.Text(cardType.mechanic || 'Механика отсутствует', {
      fontFamily: FONT,
      fontSize: 16,
      fill: colors.ui.text.primary,
      wordWrap: true,
      wordWrapWidth: 200,
      align: 'left'
    })
    mechanicText.x = textX
    mechanicText.y = topY + bioText.height + 10 // +10px отступ
    detailModal.content.addChild(mechanicText)
    
    // Количество в колоде (ниже механики, динамически)
    const countText = new PIXI.Text(`В колоде: ${count}`, {
      fontFamily: FONT,
      fontSize: 18,
      fill: colors.ui.text.secondary
    })
    countText.x = textX
    countText.y = topY + bioText.height + 10 + mechanicText.height + 10
    detailModal.content.addChild(countText)
    
    detailModal.show()
    
    // Добавляем поверх текущего модального окна
    this.modal.container.addChild(detailModal.container)
  }
}
