import * as PIXI from 'pixi.js'
import { BlurFilter } from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { soundManager } from '../audio/sound_manager.js'

// Цвета из old проекта
const COLORS = {
  main: 0x39751b,
  mainHover: 0x4a9c2d,
  red: 0x8c1300,
  purple: 0x8a2791,
  black: 0x282424,
  white: 0xffffff
}

export class Button extends PIXI.Container {
  constructor(text, options = {}) {
    super()
    
    this.textStr = text
    this.btnWidth = options.width || 240
    this.btnHeight = options.height || 80
    this.color = options.color || COLORS.main
    this.fontSize = options.fontSize || 28
    this.onClick = options.onClick || null
    this.app = options.app || null
    
    this.targetScale = 1
    this.currentScale = 1
    
    this.eventMode = 'static'
    this.cursor = 'pointer'
    
    this.create()
  }
  
  create() {
    // Тень с blur
    this.shadow = new PIXI.Graphics()
    this.addChild(this.shadow)
    
    // Фон кнопки
    this.bg = new PIXI.Graphics()
    this.addChild(this.bg)
    
    // Текст
    this.label = new PIXI.Text(this.textStr, {
      fontFamily: FONT,
      fontSize: this.fontSize,
      fontWeight: 'bold',
      fill: COLORS.white
    })
    this.label.anchor.set(0.5)
    this.label.x = this.btnWidth / 2
    this.label.y = this.btnHeight / 2
    this.addChild(this.label)
    
    // Установить pivot по центру для правильного scale
    this.pivot.set(this.btnWidth / 2, this.btnHeight / 2)
    this.x = this.btnWidth / 2
    this.y = this.btnHeight / 2
    
    // Интерактивность
    this.on('pointerover', this.onHover, this)
    this.on('pointerout', this.onOut, this)
    this.on('pointerdown', this.onDown, this)
    this.on('pointerup', this.onUp, this)
    this.on('pointerupoutside', this.onUp, this)
    
    // Анимация scale
    if (this.app) {
      this.app.ticker.add(this.updateScale, this)
    }
    
    // Рисуем начальное состояние
    this.drawBg(this.color, 1)
  }
  
  drawBg(color, scale = 1) {
    const w = this.btnWidth * scale
    const h = this.btnHeight * scale
    const radius = this.btnHeight * 0.75 * scale
    
    // Тень с blur (строго вертикальная)
    this.shadow.clear()
    this.shadow.beginFill(0x000000, 0.5)
    this.shadow.drawRoundedRect(0, 6, w, h, radius)
    this.shadow.endFill()
    this.shadow.filters = [new BlurFilter(8)]
    
    // Основной фон с бордером
    this.bg.clear()
    this.bg.lineStyle(1, COLORS.white)
    this.bg.beginFill(color)
    this.bg.drawRoundedRect(0, 0, w, h, radius)
    this.bg.endFill()
  }
  
  onHover() {
    this.targetScale = 1.05
    this.drawBg(this.color === COLORS.red ? 0xa01500 : COLORS.mainHover, 1.05)
    this.label.style.fontSize = this.fontSize * 1.05
    soundManager.play('hover')
  }
  
  onOut() {
    this.targetScale = 1
    this.drawBg(this.color, 1)
    this.label.style.fontSize = this.fontSize
  }
  
  onDown() {
    this.targetScale = 0.95
    this.drawBg(this.color, 0.95)
    this.label.style.fontSize = this.fontSize * 0.95
  }
  
  onUp() {
    this.targetScale = 1.05
    this.drawBg(this.color, 1.05)
    this.label.style.fontSize = this.fontSize * 1.05
    
    if (this.onClick) {
      this.onClick()
    }
  }
  
  updateScale() {
    if (Math.abs(this.currentScale - this.targetScale) > 0.001) {
      this.currentScale += (this.targetScale - this.currentScale) * 0.2
      this.scale.set(this.currentScale)
    }
  }
  
  setText(text) {
    this.textStr = text
    this.label.text = text
  }
  
  setColor(color) {
    this.color = color
    this.drawBg(color, 1)
  }
  
  destroy() {
    if (this.app) {
      this.app.ticker.remove(this.updateScale, this)
    }
    super.destroy()
  }
}