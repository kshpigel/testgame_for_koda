import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { soundManager } from '../audio/sound_manager.js'
import { config } from '../data/config.js'

// Настройки карты
const CARD_CONFIG = {
  width: 120,
  height: 170,
  cornerRadius: 10,
  selectedScale: 1.1,
  hoverScale: 1.05,
  colors: {
    normal: 0x3a3a3a,
    selected: 0x4a7c4a,
    hover: 0x4a5a4a,
    disabled: 0x222222,
    border: 0x666666,
    borderSelected: 0x4a9c6d,
    borderHover: 0x5a8c5a
  }
}

export class Card extends PIXI.Container {
  constructor(cardData, options = {}) {
    super()
    
    this.cardData = cardData
    this.isSelected = false
    this.isDisabled = false
    this.buffValue = 0
    
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
    
    // === СЛОЙ 4: Название карты ===
    const cardName = this.cardData.name || `Тип ${this.cardData.type}`
    const nameText = new PIXI.Text(cardName, {
      fontFamily: FONT,
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffffff'
    })
    nameText.anchor.set(0.5, 1)
    nameText.y = 65
    this.addChild(nameText)
    
    // Подстраиваем ширину карты под название (как в оригинале)
    const nameWidth = nameText.width + 20
    if (nameWidth > this.cardWidth) {
      this.cardWidth = Math.min(nameWidth, 180) // Максимум 180
      this.pivot.set(this.cardWidth / 2, this.cardHeight / 2)
    }
    
    console.log(`Card created: ${cardName}, width: ${this.cardWidth}, height: ${this.cardHeight}`)
    
    // === СЛОЙ 5: Зеленый кружочек с силой ===
    const typeBg = new PIXI.Graphics()
    typeBg.beginFill(0x39751b) // Зелёный как в оригинале
    typeBg.drawCircle(-54, 34, 18)
    typeBg.endFill()
    this.addChild(typeBg)
    
    this.typeText = new PIXI.Text(`${this.cardData.value}`, {
      fontFamily: FONT,
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#ffffff'
    })
    this.typeText.anchor.set(0.5)
    this.typeText.x = -54
    this.typeText.y = 34
    this.addChild(this.typeText)
    
    // === СЛОЙ 6: Бафф ===
    this.buffText = new PIXI.Text('', {
      fontFamily: FONT,
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#66ff66'
    })
    this.buffText.anchor.set(0.5)
    this.buffText.x = this.cardWidth / 2 - 15
    this.buffText.y = -this.cardHeight / 2 + 40
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
  }

  drawBg(color) {
    this.bg.clear()
    const c = CARD_CONFIG.colors
    const borderColor = this.isSelected ? c.borderSelected : (this.isDisabled ? c.border : c.borderHover)
    const bgColor = this.isDisabled ? c.disabled : (this.isSelected ? c.selected : color)
    
    // Рисуем относительно центра (так как pivot по центру)
    this.bg.lineStyle(2, borderColor)
    this.bg.beginFill(bgColor)
    this.bg.drawRoundedRect(-this.cardWidth/2, -this.cardHeight/2, this.cardWidth, this.cardHeight, CARD_CONFIG.cornerRadius)
    this.bg.endFill()
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
      this.heroImage.y = -46 // Позиция героя (отрицательное = выше центра)
      
      // Вписать в область
      const maxW = this.cardWidth// - 20
      const maxH = this.cardHeight// - 60
      const scale = Math.min(maxW / texture.width, maxH / texture.height)
      this.heroImage.scale.set(scale)
      
      // Добавляем на слой 3
      this.addChildAt(this.heroImage, 2)
    }
  }

  onHover() {
    if (this.isDisabled) return
    
    if (config.debug) console.log('Card hover:', this.cardData.type)
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
    } else {
      this.buffText.text = ''
    }
  }

  clearBuffs() {
    this.buffValue = 0
    this.buffText.text = ''
    this.updateValue()
  }

  getValue() {
    return this.cardData.value + this.buffValue
  }

  applySkill() {
    // Логика умений карт - можно расширить
  }

  updateValue() {
    const totalValue = this.cardData.value + this.buffValue
    this.typeText.text = `${totalValue}`
  }

  update() {
    // Плавная анимация scale
    if (Math.abs(this.scale.x - this.targetScale) > 0.001) {
      const diff = this.targetScale - this.scale.x
      this.scale.set(this.scale.x + diff * 0.2)
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