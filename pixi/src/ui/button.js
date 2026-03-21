import * as PIXI from 'pixi.js'
import { BlurFilter } from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { config } from '../data/config.js'
import { soundManager } from '../audio/sound_manager.js'
import { UINode } from './ui_node.js'

// Локальные алиасы для удобства
const COLORS = {
  main: colors.ui.button.play,
  mainHover: colors.ui.button.hover,
  red: colors.ui.button.reset,
  purple: colors.card.circle.buffed,
  black: colors.ui.panel.bg,
  white: colors.ui.button.white
}

export class Button extends UINode {
  constructor(text, options = {}) {
    // UINode установит pivot по центру, подключит scale анимацию
    super({
      width: options.width || 240,
      height: options.height || 80,
      app: options.app || null,
      scaleSpeed: 0.2
    })
    
    this.textStr = text
    this.color = options.color || COLORS.main
    this.fontSize = options.fontSize || 28
    this.onClick = options.onClick || null
    
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
    
    // Текст - от центра (благодаря pivot из UINode)
    this.label = new PIXI.Text(this.textStr, {
      fontFamily: FONT,
      fontSize: this.fontSize,
      fontWeight: 'bold',
      fill: COLORS.white
    })
    this.label.anchor.set(0.5)
    this.label.x = 0
    this.label.y = 0
    this.addChild(this.label)
    
    // Интерактивность
    this.on('pointerover', this.onHover, this)
    this.on('pointerout', this.onOut, this)
    this.on('pointerdown', this.onDown, this)
    this.on('pointerup', this.onUp, this)
    this.on('pointerupoutside', this.onUp, this)
    
    // Рисуем начальное состояние
    this.drawBg(this.color, 1)
    
    // Debug рамка (наследуется от UINode)
    this.updateDebug()
  }
  
  drawBg(color) {
    const w = this.width
    const h = this.height
    const radius = h * 0.75
    
    // Тень с blur - от центра
    this.shadow.clear()
    this.shadow.beginFill(0x000000, 0.5)
    this.shadow.drawRoundedRect(-w/2, -h/2 + 6, w, h, radius)
    this.shadow.endFill()
    this.shadow.filters = [new BlurFilter(8)]
    
    // Основной фон с бордером - от центра
    this.bg.clear()
    this.bg.lineStyle(1, COLORS.white)
    this.bg.beginFill(color)
    this.bg.drawRoundedRect(-w/2, -h/2, w, h, radius)
    this.bg.endFill()
  }
  
  onHover() {
    this.setScale(1.05)
    this.drawBg(this.color === COLORS.red ? 0xa01500 : COLORS.mainHover)
    this.label.style.fontSize = this.fontSize * 1.05
    soundManager.play('hover')
  }
  
  onOut() {
    this.setScale(1)
    this.drawBg(this.color)
    this.label.style.fontSize = this.fontSize
  }
  
  onDown() {
    this.setScale(0.95)
    this.drawBg(this.color)
    this.label.style.fontSize = this.fontSize * 0.95
  }
  
  onUp() {
    this.setScale(1.05)
    this.drawBg(this.color)
    this.label.style.fontSize = this.fontSize * 1.05
    
    if (this.onClick) {
      this.onClick()
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
  
  setDisabled(disabled) {
    this.isDisabled = disabled
    this.eventMode = disabled ? 'none' : 'static'
    this.cursor = disabled ? 'default' : 'pointer'
  }
  
  destroy() {
    super.destroy()
  }
}