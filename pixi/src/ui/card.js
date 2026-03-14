import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { soundManager } from '../audio/sound_manager.js'
import { config } from '../data/config.js'

// Настройки карты
const CARD_CONFIG = {
  width: 100,
  height: 140,
  cornerRadius: 8,
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
    
    this.width = options.width || CARD_CONFIG.width
    this.height = options.height || CARD_CONFIG.height
    
    // Позиция в руке
    this.handIndex = options.handIndex || 0
    this.targetX = 0
    this.targetY = 0
    
    this.create()
  }

  create() {
    // Основной контейнер для удобства масштабирования
    this.cardContainer = new PIXI.Container()
    this.addChild(this.cardContainer)
    
    // Фон карты
    this.bg = new PIXI.Graphics()
    this.drawBg(CARD_CONFIG.colors.normal)
    this.cardContainer.addChild(this.bg)
    
    // Картинка карты (если есть)
    if (this.cardData.image) {
      this.cardImage = new PIXI.Sprite()
      this.cardImage.anchor.set(0.5)
      this.cardImage.y = -10
      this.cardContainer.addChild(this.cardImage)
    }
    
    // Номер типа карты (большой по центру)
    this.typeText = new PIXI.Text(`${this.cardData.type}`, {
      fontFamily: FONT,
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#ffffff'
    })
    this.typeText.anchor.set(0.5)
    this.typeText.y = 10
    this.cardContainer.addChild(this.typeText)
    
    // Значение карты
    this.valueText = new PIXI.Text(`${this.cardData.value}`, {
      fontFamily: FONT,
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#ff6666'
    })
    this.valueText.anchor.set(0.5)
    this.valueText.x = this.width / 2 - 12
    this.valueText.y = -this.height / 2 + 12
    this.cardContainer.addChild(this.valueText)
    
    // Бафф
    this.buffText = new PIXI.Text('', {
      fontFamily: FONT,
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#66ff66'
    })
    this.buffText.anchor.set(0.5)
    this.buffText.x = this.width / 2 - 12
    this.buffText.y = -this.height / 2 + 32
    this.cardContainer.addChild(this.buffText)
    
    // Установить размеры
    this.cardContainer.scale.set(this.width / CARD_CONFIG.width)
    
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
    
    this.bg.lineStyle(2, borderColor)
    this.bg.beginFill(bgColor)
    this.bg.drawRoundedRect(0, 0, this.width, this.height, CARD_CONFIG.cornerRadius)
    this.bg.endFill()
  }

  loadImage(texture) {
    if (this.cardImage && texture) {
      this.cardImage.texture = texture
      const scale = Math.min((this.width - 20) / texture.width, 60 / texture.height)
      this.cardImage.scale.set(scale)
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
    // Перерисовываем значение с учётом баффа
    this.updateValue()
  }

  updateValue() {
    const totalValue = this.cardData.value + this.buffValue
    this.valueText.text = `${totalValue}`
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
      width: this.width,
      height: this.height,
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
