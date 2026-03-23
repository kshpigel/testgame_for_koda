import * as PIXI from 'pixi.js'
import { BlurFilter } from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors, gradientColors } from '../data/colors.js'
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

// Строковые цвета для canvas (не конвертируются в числа)
const STR_COLORS = {
  white: '#F5E7CF'
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
    
    // Фон кнопки (контейнер для градиента или Graphics)
    this.bg = new PIXI.Container()
    this.bgGraphics = new PIXI.Graphics()
    this.bg.addChild(this.bgGraphics)
    this.addChild(this.bg)
    
    // Тень текста: полупрозрачный чёрный через hex с альфой (#00000080 = 50%)
    this.labelShadow = new PIXI.Text(this.textStr, {
      fontFamily: FONT,
      fontSize: this.fontSize,
      fontWeight: 'bold',
      fill: '#00000080'
    })
    this.labelShadow.anchor.set(0.5)
    this.labelShadow.x = 0
    this.labelShadow.y = 4
    this.labelShadow.anchor.set(0.5)
    this.labelShadow.x = 2
    this.labelShadow.y = 2
    this.addChild(this.labelShadow)
    
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
    
    // Основной фон (бордер рисуем на canvas)
    this.bgGraphics.clear()
    
    // Проверяем, есть ли градиент для этого цвета
    const gradient = this.getGradient(color)
    if (gradient) {
      // Удаляем старые спрайты градиента
      this.bg.removeChildren()
      this.bg.addChild(this.bgGraphics)
      
      // Создаём canvas с радиальным градиентом
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      
      const centerX = w / 2
      const centerY = h / 2
      const gradientRadius = Math.max(w, h) * 0.8
      
      const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, gradientRadius)
      grd.addColorStop(0, gradient.center)
      grd.addColorStop(0.6, gradient.mid || gradient.center)
      grd.addColorStop(1, gradient.edge)
      
      ctx.fillStyle = grd
      // Радиус скругления меньше чем радиус градиента
      this.roundRect(ctx, 0, 0, w, h, h * 0.35)
      ctx.fill()
      
      // Бордер 2px белый
      ctx.strokeStyle = STR_COLORS.white
      ctx.lineWidth = 2
      this.roundRect(ctx, 0, 0, w, h, h * 0.35)
      ctx.stroke()
      
      const texture = PIXI.Texture.from(canvas)
      const sprite = new PIXI.Sprite(texture)
      sprite.anchor.set(0.5)
      this.bg.addChild(sprite)
    } else {
      // Простой цвет без градиента
      this.bgGraphics.beginFill(color)
      this.bgGraphics.drawRoundedRect(-w/2, -h/2, w, h, radius)
      this.bgGraphics.endFill()
    }
  }
  
  // Получить градиент по цвету (радиальный: center -> mid -> edge)
  getGradient(color) {
    // Красный (reset/exit)
    if (color === COLORS.red) {
      return gradientColors.button.red
    }
    // Зелёный (play)
    if (color === COLORS.main) {
      return gradientColors.button.green
    }
    // Hover красный
    if (color === 0xa01500 || color === '#a01500') {
      return gradientColors.button.redHover
    }
    // Hover зелёный
    if (color === COLORS.mainHover) {
      return gradientColors.button.greenHover
    }
    return null
  }
  
  // Утилита для рисования rounded rect на canvas
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
  
  onHover() {
    this.setScale(1.02)
    this.drawBg(this.color === COLORS.red ? 0xa01500 : COLORS.mainHover)
    soundManager.play('hover')
  }
  
  onOut() {
    this.setScale(1)
    this.drawBg(this.color)
  }
  
  onDown() {
    this.setScale(0.98)
    this.drawBg(this.color)
  }
  
  onUp() {
    this.setScale(1.02)
    this.drawBg(this.color)
    
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