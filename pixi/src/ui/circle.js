import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'

export class Circle extends PIXI.Container {
  constructor(options = {}) {
    super()
    
    this.radius = options.radius || 18
    this.bgColor = options.bgColor || 0x4a7c4a
    this.borderColor = options.borderColor || 0xffffff
    this.borderWidth = options.borderWidth || 1
    this.text = options.text || ''
    this.fontSize = options.fontSize || 16
    
    // Абсолютные координаты
    this.x = options.x || 0
    this.y = options.y || 0
    
    // Относительные координаты (для масштабируемых карт)
    this.xRatio = options.xRatio !== undefined ? options.xRatio : null
    this.yRatio = options.yRatio !== undefined ? options.yRatio : null
    
    this.create()
  }

  create() {
    this.bg = new PIXI.Graphics()
    this.draw()
    this.addChild(this.bg)
    
    this.textObj = new PIXI.Text(this.text, {
      fontFamily: FONT,
      fontSize: this.fontSize,
      fontWeight: 'bold',
      fill: '#ffffff'
    })
    this.textObj.anchor.set(0.5)
    this.addChild(this.textObj)
  }

  draw() {
    this.bg.clear()
    this.bg.lineStyle(this.borderWidth, this.borderColor)
    this.bg.beginFill(this.bgColor)
    this.bg.drawCircle(0, 0, this.radius)
    this.bg.endFill()
  }

  setText(text, animate = true) {
    // Анимация только при изменении значения
    const shouldAnimate = animate && String(this.text) !== String(text)
    
    this.text = text
    this.textObj.text = text
    
    if (shouldAnimate) {
      this.animatePulse()
    }
  }
  
  animatePulse() {
    const originalScale = 1
    const targetScale = 1.3
    let scale = originalScale
    
    const animate = () => {
      if (scale < targetScale) {
        scale += 0.05
        this.scale.set(scale)
        requestAnimationFrame(animate)
      } else {
        // Обратная анимация
        const animateBack = () => {
          if (scale > originalScale) {
            scale -= 0.05
            this.scale.set(scale)
            requestAnimationFrame(animateBack)
          } else {
            this.scale.set(originalScale)
          }
        }
        requestAnimationFrame(animateBack)
      }
    }
    animate()
  }

  setBgColor(color) {
    this.bgColor = color
    this.draw()
  }

  setBorderColor(color) {
    this.borderColor = color
    this.draw()
  }

  setRadius(radius) {
    this.radius = radius
    this.draw()
  }

  setSize(radius) {
    this.setRadius(radius)
  }

  setPosition(x, y) {
    this.x = x
    this.y = y
  }

  configure(options) {
    if (options.radius !== undefined) this.setRadius(options.radius)
    if (options.bgColor !== undefined) this.setBgColor(options.bgColor)
    if (options.borderColor !== undefined) this.setBorderColor(options.borderColor)
    if (options.text !== undefined) this.setText(options.text)
    if (options.x !== undefined) this.x = options.x
    if (options.y !== undefined) this.y = options.y
  }
}
