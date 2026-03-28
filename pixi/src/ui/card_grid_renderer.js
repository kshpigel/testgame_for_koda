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
import { Button } from './button.js'
import { soundManager } from '../audio/sound_manager.js'
import { t } from '../data/i18n.js'

/**
 * CardGridRenderer - универсальный рендер карт в сетку со скроллом
 * 
 * ПАРАМЕТРЫ:
 * - app: PIXI.Application
 * - cards: Array - массив данных карт (каждый элемент {type, count, ...} или полный объект карты)
 * - assets: Object - текстуры ассетов
 * - options:
 *   - columns: кол-во колонок (по умолчанию 6)
 *   - cardScale: масштаб карт (по умолчанию 0.6)
 *   - gap: отступ между картами (по умолчанию 8)
 *   - onCardClick: колбэк при клике на карту (cardData, count) => {}
 *   - showCount: показывать количество (по умолчанию true)
 *   - grayscaleZero: делать серым карты с count=0 (по умолчанию true)
 *   - sortBy: 'value' | 'type' - сортировка (по умолчанию 'value')
 *   - sortDesc: по убыванию (по умолчанию true)
 */
export class CardGridRenderer {
  constructor(app, cards, assets, options = {}) {
    this.app = app
    this.cards = cards // [{type, count, ...}] или [fullCardData, ...]
    this.assets = assets
    this.cardTypes = options.cardTypes || [] // Данные всех типов карт
    this.options = {
      columns: options.columns || 6,
      cardScale: options.cardScale || 0.6,
      gap: options.gap || 8,
      onCardClick: options.onCardClick || null,
      showCount: options.showCount !== false,
      grayscaleZero: options.grayscaleZero !== false,
      sortBy: options.sortBy || 'value',
      sortDesc: options.sortDesc !== false
    }
    
    this.cardWidth = CARD_CONFIG.width * this.options.cardScale
    this.cardHeight = CARD_CONFIG.height * this.options.cardScale
    
    this.grayFilter = new ColorMatrixFilter()
    this.grayFilter.grayscale(0.5)
    
    this.cardSprites = []
    this.scrollContainer = null
    this.scrollbar = null
    this.contentHeight = 0
    this.scrollY = 0
    this.targetScrollY = 0
    this.isDragging = false
    this.dragStartY = 0
    this.dragStartScrollY = 0
    
    this.isWheelActive = false
  }
  
  // Основной метод - создаёт контейнер с картами
  render(container) {
    // Подготовка данных карт
    const cardDataList = this.prepareCardData()
    
    // Вычисляем размеры
    const cols = this.options.columns
    const rows = Math.ceil(cardDataList.length / cols)
    const totalWidth = cols * (this.cardWidth + this.options.gap) - this.options.gap + 30
    const totalHeight = rows * (this.cardHeight + this.options.gap) - this.options.gap + 50
    
    this.contentHeight = totalHeight
    this.viewHeight = 320 // Высота видимой области
    this.viewWidth = 700 // Ширина видимой области
    
    // Центрируем сетку карт по горизонтали
    // Карты начинаются сверху (startY = 0)
    const startX = -totalWidth / 2 + this.cardWidth / 2 + 10
    const startY = 0 // Начинаем сверху (+15)
    
    // Создаём скролл-контейнер
    this.scrollContainer = new PIXI.Container()
    this.scrollContainer.x = 0
    this.scrollContainer.y = 0 // Старт сверху
    
    // Маска - по размеру видимой области, центрирована и смещена выше
    const mask = new PIXI.Graphics()
    mask.beginFill(0xffffff)
    mask.drawRect(-this.viewWidth / 2, -this.viewHeight / 2 + 5, this.viewWidth, this.viewHeight)
    mask.endFill()
    // Маска должна быть в том же контейнере что и scrollContainer
    container.addChild(mask)
    this.scrollContainer.mask = mask
    
    // Добавляем карты в контейнер
    cardDataList.forEach((cardData, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      
      const card = this.createCardSprite(cardData)
      card.x = startX + col * (this.cardWidth + this.options.gap)
      card.y = startY + row * (this.cardHeight + this.options.gap)
      
      this.scrollContainer.addChild(card)
      this.cardSprites.push(card)
    })
    
    container.addChild(this.scrollContainer)
    
    // Создаём скроллбар если нужно
    const maxScroll = Math.max(0, totalHeight - this.viewHeight)
    if (maxScroll > 0) {
      this.createScrollbar(container, totalHeight)
      this.setupWheel(container)
    }
  }
  
  // Подготовить данные карт
  prepareCardData() {
    // Преобразуем входные данные в массив {type, count, ...cardData}
    let cardDataList = []
    
    if (this.cards.length === 0) return []
    
    // Если это массив чисел (типов карт) - преобразуем в {type, count}
    if (typeof this.cards[0] === 'number') {
      const counts = {}
      this.cards.forEach(type => {
        counts[type] = (counts[type] || 0) + 1
      })
      cardDataList = Object.entries(counts).map(([type, count]) => ({
        type: parseInt(type),
        count
      }))
    } else if (this.cards[0] && this.cards[0].type !== undefined && this.cards[0].count !== undefined) {
      // Уже правильный формат {type, count, ...}
      cardDataList = [...this.cards]
    } else if (this.cards[0] && this.cards[0].type !== undefined) {
      // Массив объектов карт - считаем count
      const counts = {}
      this.cards.forEach(card => {
        counts[card.type] = (counts[card.type] || 0) + 1
      })
      cardDataList = Object.entries(counts).map(([type, count]) => ({
        type: parseInt(type),
        count,
        ...this.cards.find(c => c.type === parseInt(type))
      }))
    }
    
    // Сортировка
    cardDataList.sort((a, b) => {
      let valA, valB
      if (this.options.sortBy === 'type') {
        valA = a.type
        valB = b.type
      } else {
        valA = a.value || 0
        valB = b.value || 0
      }
      return this.options.sortDesc ? valB - valA : valA - valB
    })
    
    return cardDataList
  }
  
  // Создать спрайт карты
  createCardSprite(cardData) {
    const cardType = this.findCardType(cardData.type)
    const cardStyle = cardType ? getCardStyle(cardType.style) : null
    
    const card = new Card(cardType || { type: cardData.type, name: `Type ${cardData.type}`, value: 0 }, {
      width: CARD_CONFIG.width,
      height: CARD_CONFIG.height,
      scale: this.options.cardScale,
      style: cardStyle
    })
    
    // Grayscale если count = 0
    if (this.options.grayscaleZero && cardData.count === 0) {
      card.filters = [this.grayFilter]
    }
    
    // Загружаем изображения
    if (this.assets && cardType) {
      if (this.assets[`card_bg_${cardType.type}`]) {
        card.loadBgImage(this.assets[`card_bg_${cardType.type}`].texture)
      }
      if (this.assets[`card_${cardType.type}`]) {
        card.loadHeroImage(this.assets[`card_${cardType.type}`].texture)
      }
    }
    
    // Клик - детальная информация
    card.eventMode = 'static'
    card.cursor = 'pointer'
    card.on('pointerdown', () => {
      soundManager.play('click')
      if (this.options.onCardClick) {
        this.options.onCardClick(cardType, cardData.count)
      } else {
        this.showCardDetails(cardType, cardData.count)
      }
    })
    
    // Кружок с количеством
    if (this.options.showCount && cardData.count !== undefined) {
      const countCircle = new Circle({
        xRatio: 0.4,
        yRatio: -0.4,
        radius: 12,
        bgColor: colors.ui.circle.bg,
        borderColor: colors.ui.circle.border,
        text: `${cardData.count}`,
        fontSize: 12
      })
      countCircle.setDarkStyle()
      card.countCircle = countCircle
      card.addChild(countCircle)
      countCircle.scale.set(1 / this.options.cardScale)
      card.updateChildPositions()
    }
    
    return card
  }
  
  // Найти данные карты по типу
  findCardType(type) {
    // Ищем в cardTypes (может быть передан в конструкторе или через setCardTypes)
    const types = this.cardTypes || []
    return types.find(c => c.type === type)
  }
  
  // Создать скроллбар
  createScrollbar(container, totalHeight) {
    const viewHeight = this.viewHeight
    const scrollbarWidth = 5
    const scrollbarHeight = Math.min(viewHeight, (viewHeight / totalHeight) * viewHeight)
    const trackHeight = viewHeight - 20
    
    // Трек скроллбара (справа, центрировано)
    const track = new PIXI.Graphics()
    track.beginFill(colors.ui.panel.dark || 0x222222)
    track.drawRoundedRect(0, 0, scrollbarWidth, trackHeight, 5)
    track.endFill()
    track.x = this.viewWidth / 2 - scrollbarWidth - 10
    track.y = -viewHeight / 2 + 15
    container.addChild(track)
    
    // Ползунок
    this.scrollbar = new PIXI.Graphics()
    this.scrollbar.beginFill(colors.ui.text.primary)
    this.scrollbar.drawRoundedRect(0, 0, scrollbarWidth, scrollbarHeight, 5)
    this.scrollbar.endFill()
    this.scrollbar.x = this.viewWidth / 2 - scrollbarWidth - 10
    this.scrollbar.y = -viewHeight / 2 + 15
    this.scrollbar.eventMode = 'static'
    this.scrollbar.cursor = 'pointer'
    
    // Drag для скроллбара
    this.scrollbar.on('pointerdown', (e) => {
      this.isDragging = true
      this.dragStartY = e.data.global.y
      this.dragStartScrollY = this.scrollY
      this.app.stage.on('pointermove', this.onDragMove, this)
      this.app.stage.on('pointerup', this.onDragEnd, this)
      this.app.stage.on('pointerupoutside', this.onDragEnd, this)
    })
    
    container.addChild(this.scrollbar)
    
    // Сохраняем параметры для расчётов
    this.scrollParams = {
      trackHeight,
      scrollbarHeight,
      totalHeight,
      viewHeight
    }
  }
  
  onDragMove(e) {
    if (!this.isDragging || !this.scrollParams) return
    
    const dy = e.data.global.y - this.dragStartY
    // Тянем вниз (dy > 0) → контент вверх → scrollY увеличивается
    const ratio = dy / (this.scrollParams.trackHeight - this.scrollParams.scrollbarHeight)
    const maxScroll = Math.max(0, this.contentHeight - this.viewHeight)
    
    this.targetScrollY = Math.max(0, Math.min(maxScroll, this.dragStartScrollY + ratio * maxScroll))
  }
  
  onDragEnd() {
    this.isDragging = false
    this.app.stage.off('pointermove', this.onDragMove, this)
    this.app.stage.off('pointerup', this.onDragEnd, this)
    this.app.stage.off('pointerupoutside', this.onDragEnd, this)
  }
  
  // Настроить колесо мыши (на весь контент, не только на карты)
  setupWheel(container) {
    // Вешаем на stage чтобы ловить скролл везде в модалке
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.on('wheel', this.onWheel, this)
    this._wheelContainer = container
  }
  
  onWheel(e) {
    if (!this._wheelContainer || !this._wheelContainer.parent) return
    e.stopPropagation()
    // wheel вниз = контент вверх = scrollY увеличивается
    const delta = e.deltaY > 0 ? 30 : -30
    const maxScroll = Math.max(0, this.contentHeight - this.viewHeight)
    this.targetScrollY = Math.max(0, Math.min(maxScroll, this.targetScrollY + delta))
  }
  
  // Обновление (вызывать каждый кадр)
  update() {
    if (!this.scrollContainer) return
    
    // Плавный скролл
    if (Math.abs(this.scrollY - this.targetScrollY) > 0.5) {
      this.scrollY += (this.targetScrollY - this.scrollY) * 0.15
      // Контейнер движется в противоположную сторону от скролла
      this.scrollContainer.y = -this.scrollY
      
      // Обновляем позицию скроллбара (вниз когда скроллим вверх)
      if (this.scrollbar && this.scrollParams) {
        const maxScroll = Math.max(0, this.contentHeight - this.viewHeight)
        const ratio = maxScroll > 0 ? this.scrollY / maxScroll : 0
        const track = this.scrollParams.trackHeight - this.scrollParams.scrollbarHeight
        this.scrollbar.y = -this.viewHeight / 2 + 15 + ratio * track
      }
    }
  }
  
  // Очистка событий
  destroy() {
    if (this.app.stage) {
      this.app.stage.off('wheel', this.onWheel, this)
    }
    this._wheelContainer = null
  }
  
  // Показать детальную информацию о карте
  showCardDetails(cardType, count) {
    if (!cardType) return
    
    const detailModal = new Modal(this.app, {
      title: cardType.name || `Карта ${cardType.type}`,
      width: 500,
      height: 350,
      showCloseButton: true
    })
    detailModal.container.zIndex = 20000
    
    // Константы для позиционирования
    const heroW = 200
    const heroH = heroW * 1.5
    const contentH = 320
    const heroX = -220
    const heroY = contentH / 2 - heroH - 16
    const textX = 20
    const topY = -90
    
    // Картинка героя
    const heroContainer = new PIXI.Container()
    heroContainer.x = heroX
    heroContainer.y = heroY
    
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
      heroSprite.x = heroW / 2
      heroSprite.y = (heroW * 1.5) / 2
      heroContainer.addChild(heroSprite)
    }
    
    detailModal.content.addChild(heroContainer)
    
    // Сила карты
    const valueText = new PIXI.Text(`${t('cards.value')}: ${cardType.value || 0}`, {
      fontFamily: FONT,
      fontSize: 20,
      fontWeight: 'bold',
      fill: colors.ui.text.gold || '#FFD700'
    })
    valueText.x = textX
    valueText.y = topY
    detailModal.content.addChild(valueText)
    
    // Биография
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
    bioText.y = topY + 30
    detailModal.content.addChild(bioText)
    
    // Механика
    const mechanicText = new PIXI.Text(cardType.mechanic || t('cards.no_mechanic'), {
      fontFamily: FONT,
      fontSize: 16,
      fill: colors.ui.text.primary,
      wordWrap: true,
      wordWrapWidth: 200,
      align: 'left'
    })
    mechanicText.x = textX
    mechanicText.y = topY + 30 + bioText.height + 10
    detailModal.content.addChild(mechanicText)
    
    // Количество
    const countText = new PIXI.Text(`${t('cards.in_deck')}: ${count}`, {
      fontFamily: FONT,
      fontSize: 18,
      fill: colors.ui.text.secondary
    })
    countText.x = textX
    countText.y = topY + 30 + bioText.height + 10 + mechanicText.height + 10
    detailModal.content.addChild(countText)
    
    detailModal.show()
    this.app.stage.addChild(detailModal.container)
  }
}
