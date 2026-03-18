import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { soundManager } from '../audio/sound_manager.js'
import { config } from '../data/config.js'
import { colors } from '../data/colors.js'
import { Circle } from './circle.js'

// Настройки карты
const CARD_CONFIG = {
  width: 150,
  height: 213,
  cornerRadius: 10,
  selectedScale: 1.05,
  hoverScale: 1.05,
  colors: {
    normal: colors.card.background.normal,
    selected: colors.card.background.selected,
    hover: colors.card.background.hover,
    disabled: colors.card.background.disabled,
    border: colors.card.border.normal,
    borderSelected: colors.card.border.selected,
    borderHover: colors.card.border.hover
  }
}

export class Card extends PIXI.Container {
  constructor(cardData, options = {}) {
    super()
    
    this.cardData = cardData
    this.isSelected = false
    this.isDisabled = false
    this.buffValue = 0
    this.buffs = {} // { [buffId]: { type, value } }
    this._cachedId = null // Кешируем ID карты
    
    // Используем cardWidth/cardHeight чтобы не переопределять встроенные PIXI свойства
    this.cardWidth = options.width || CARD_CONFIG.width
    this.cardHeight = options.height || CARD_CONFIG.height
    
    // Pivot по центру
    this.pivot.set(this.cardWidth / 2, this.cardHeight / 2)
    
    // Позиция в руке
    this.handIndex = options.handIndex || 0
    this.targetX = 0
    this.targetY = 0
    this.targetScale = 1
    
    // Анимация покачивания
    this.wobbleOffset = Math.random() * Math.PI * 2 // Случайная фаза
    this.wobbleSpeed = 0.015
    this.wobbleAmount = 3 // Амплитуда в пикселях
    
    this.create()
  }

  create() {
    // === СЛОЙ 1: Фон (цветной прямоугольник) ===
    this.bg = new PIXI.Graphics()
    this.drawBg(CARD_CONFIG.colors.normal)
    this.addChild(this.bg)
    
    // === СЛОЙ 2: Фоновое изображение (image_bg) ===
    this.bgImage = null
    
    // === СЛОЙ 3: Картинка героя (image) ===
    this.heroImage = null
    this.heroImageYRatio = -0.27 // 27% от высоты сверху
    
    // === СЛОЙ 4: Название карты ===
    const cardName = this.cardData.name || `Тип ${this.cardData.type}`
    this.nameText = new PIXI.Text(cardName, {
      fontFamily: FONT,
      fontSize: 17,
      fontWeight: 'bold',
      fill: colors.ui.text.primary
    })
    this.nameText.anchor.set(0.5, 1)
    this.nameText.yRatio = 0.38 // 38% от высоты сверху
    this.addChild(this.nameText)
    
    // === СЛОЙ 5: Кружочек с силой (относительно ширины карты) ===
    this.valueCircle = new Circle({
      xRatio: -0.45, // 45% от ширины слева
      yRatio: 0.18,   // 20% от высоты сверху
      radius: 20,
      bgColor: colors.card.circle.normal,
      borderColor: colors.card.circle.border,
      text: `${this.cardData.value}`
    })
    this.addChild(this.valueCircle)
    
    // === СЛОЙ 6: Бафф (относительно размеров карты) ===
    this.buffText = new PIXI.Text('', {
      fontFamily: FONT,
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#66ff66'
    })
    this.buffText.anchor.set(0.5)
    this.buffText.xRatio = 0.12 // 12% от ширины слева
    this.buffText.yRatio = 0.24 // 24% от высоты сверху
    this.addChild(this.buffText)
    
    // Перерисовываем фон с правильными размерами
    this.drawBg(CARD_CONFIG.colors.normal)
    
    // Интерактивность
    this.eventMode = 'static'
    this.cursor = 'pointer'
    
    this.on('pointerover', this.onHover, this)
    this.on('pointerout', this.onOut, this)
    this.on('pointerdown', this.onDown, this)
    this.on('pointerup', this.onUp, this)
    this.on('pointerupoutside', this.onUp, this)
    
    // Установить начальные позиции
    this.updateChildPositions()
  }

  drawBg(color) {
    this.bg.clear()
    const c = CARD_CONFIG.colors
    
    const borderWidth = 3
    const offset = 2
    
    if (this.isSelected) {
      // Белая обводка когда выбрана
      this.bg.lineStyle(borderWidth, colors.card.border.white)
      this.bg.drawRoundedRect(
        -this.cardWidth/2 - offset, 
        -this.cardHeight/2 - offset, 
        this.cardWidth + offset*2, 
        this.cardHeight + offset*2, 
        CARD_CONFIG.cornerRadius + offset
      )
    } else if (this.isDisabled) {
      // Серая обводка для недоступных
      this.bg.lineStyle(borderWidth, colors.card.border.disabled)
      this.bg.drawRoundedRect(
        -this.cardWidth/2 - offset, 
        -this.cardHeight/2 - offset, 
        this.cardWidth + offset*2, 
        this.cardHeight + offset*2, 
        CARD_CONFIG.cornerRadius + offset
      )
    }
    // Если не выбрана и не disabled - не рисуем бордер (прозрачная)
  }

  // Загрузить фоновое изображение (image_bg)
  loadBgImage(texture) {
    if (texture) {
      this.bgImage = new PIXI.Sprite(texture)
      this.bgImage.anchor.set(0.5)
      this.bgImage.y = 0
      
      // Cover - заполнить весь фон
      const scale = Math.max(this.cardWidth / texture.width, this.cardHeight / texture.height)
      this.bgImage.scale.set(scale)
      
      // Добавляем на слой 2 (после bg, перед heroImage)
      this.addChildAt(this.bgImage, 1)
    }
  }

  // Загрузить изображение героя (image)
  loadHeroImage(texture) {
    if (texture) {
      this.heroImage = new PIXI.Sprite(texture)
      this.heroImage.anchor.set(0.5)
      // Позиция устанавливается в updateChildPositions через heroImageYRatio
      
      // Вписать в область
      const maxW = this.cardWidth
      const maxH = this.cardHeight
      const scale = Math.min(maxW / texture.width, maxH / texture.height)
      this.heroImage.scale.set(scale)
      
      // Добавляем на слой 3
      this.addChildAt(this.heroImage, 2)
      
      // Обновить позицию после загрузки
      this.updateChildPositions()
    }
  }

  onHover() {
    if (this.isDisabled || !config.debug) return
    soundManager.play('hover')
    
    if (!this.isSelected) {
      this.targetScale = CARD_CONFIG.hoverScale
      this.drawBg(CARD_CONFIG.colors.hover)
    }
  }

  onOut() {
    if (this.isDisabled) return
    
    if (!this.isSelected) {
      this.targetScale = 1
      this.drawBg(CARD_CONFIG.colors.normal)
    }
  }

  onDown() {
    if (this.isDisabled) return
    
    this.targetScale = 0.95
    soundManager.play('click')
  }

  onUp() {
    if (this.isDisabled) return
    
    this.targetScale = this.isSelected ? CARD_CONFIG.selectedScale : CARD_CONFIG.hoverScale
  }

  select() {
    this.isSelected = true
    this.targetScale = CARD_CONFIG.selectedScale
    this.drawBg(CARD_CONFIG.colors.selected)
  }

  deselect() {
    this.isSelected = false
    this.targetScale = 1
    this.drawBg(CARD_CONFIG.colors.normal)
  }

  setDisabled(disabled) {
    this.isDisabled = disabled
    this.drawBg(CARD_CONFIG.colors.normal)
    this.alpha = disabled ? 0.5 : 1
  }

  setBuff(value) {
    this.buffValue = value
    if (value > 0) {
      this.buffText.text = `+${value}`
      this.valueCircle.setBgColor(colors.card.circle.buffed)
    } else {
      this.buffText.text = ''
      this.valueCircle.setBgColor(colors.card.circle.normal)
    }
  }

  clearBuffs() {
    this.buffs = {}
    this.buffValue = 0
    this.buffText.text = ''
    this.valueCircle.setBgColor(colors.card.circle.normal)
    this.updateValue()
  }

  getValue() {
    return this.cardData.value + this.buffValue
  }

  get type() {
    return this.cardData.type
  }

  get id() {
    if (!this._cachedId) {
      this._cachedId = this.cardData.id || `card_${Math.random().toString(16).slice(2)}`
    }
    return this._cachedId
  }

  getBuffByType(type) {
    return Object.values(this.buffs).filter(b => b.type === type)
  }

  addBuff(buffId, type, value) {
    this.buffs[buffId] = { type, value }
    this.updateBuffDisplay()
  }

  removeBuff(buffId) {
    delete this.buffs[buffId]
    this.updateBuffDisplay()
  }

  updateBuffDisplay() {
    // Пересчитываем общий бафф
    let total = 0
    Object.values(this.buffs).forEach(b => {
      total += b.value
    })
    this.buffValue = total
    
    if (total > 0) {
      this.buffText.text = `+${total}`
      this.valueCircle.setBgColor(colors.card.circle.buffed)
    } else {
      this.buffText.text = ''
      this.valueCircle.setBgColor(colors.card.circle.normal)
    }
    
    this.updateValue()
  }

  applySkill() {
    // Логика умений карт - можно расширить
  }

  updateValue() {
    const totalValue = this.cardData.value + this.buffValue
    this.valueCircle.setText(`${totalValue}`)
  }

  update() {
    // Плавная анимация scale
    const prevScale = this.scale.x
    if (Math.abs(this.scale.x - this.targetScale) > 0.001) {
      const diff = this.targetScale - this.scale.x
      this.scale.set(this.scale.x + diff * 0.1)
      
      // При изменении scale обновляем позиции дочерних элементов
      if (Math.abs(this.scale.x - prevScale) > 0.01) {
        this.updateChildPositions()
      }
    }
    
    // Анимация покачивания (добавляем к targetY, не перезаписываем y напрямую)
    this.wobbleOffset += this.wobbleSpeed
    const wobble = Math.sin(this.wobbleOffset) * this.wobbleAmount
    if (this.y !== this.targetY + wobble) {
      this.y = this.targetY + wobble
    }
  }

  updateChildPositions() {
    // Обновляем позиции элементов с относительными координатами
    const w = this.cardWidth
    const h = this.cardHeight
    
    if (this.valueCircle) {
      if (this.valueCircle.xRatio !== null) {
        this.valueCircle.x = -w/2 + w * (0.5 + this.valueCircle.xRatio)
      }
      if (this.valueCircle.yRatio !== null) {
        this.valueCircle.y = -h/2 + h * (0.5 + this.valueCircle.yRatio)
      }
    }
    
    // nameText
    if (this.nameText && this.nameText.yRatio !== undefined) {
      this.nameText.y = -h/2 + h * (0.5 + this.nameText.yRatio)
    }
    
    // heroImage
    if (this.heroImage && this.heroImageYRatio !== undefined) {
      this.heroImage.y = -h/2 + h * (0.5 + this.heroImageYRatio)
    }
    
    // buffText
    if (this.buffText && this.buffText.xRatio !== undefined) {
      this.buffText.x = -w/2 + w * (0.5 + this.buffText.xRatio)
      this.buffText.y = -h/2 + h * (0.5 + this.buffText.yRatio)
    }
  }

  // Клонировать карту
  clone() {
    const newCard = new Card(this.cardData, {
      width: this.cardWidth,
      height: this.cardHeight,
      handIndex: this.handIndex
    })
    
    // Копируем состояние
    if (this.isSelected) newCard.select()
    if (this.isDisabled) newCard.setDisabled(true)
    if (this.buffValue > 0) newCard.setBuff(this.buffValue)
    
    // Копируем позицию
    newCard.x = this.x
    newCard.y = this.y
    newCard.targetX = this.targetX
    newCard.targetY = this.targetY
    
    return newCard
  }
}

export { CARD_CONFIG }