import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { UINode } from './ui_node.js'

export class Circle extends UINode {
  constructor(options = {}) {
    const radius = options.radius || 18
    super({
      width: radius * 2,
      height: radius * 2,
      app: options.app || null,
      scaleSpeed: 0.15
    })
    
    this.radius = radius
    this.bgColor = options.bgColor || colors.ui.circle.bg
    this.borderColor = options.borderColor || colors.ui.circle.border
    this.borderWidth = options.borderWidth || 1
    this.text = options.text || ''
    this.fontSize = options.fontSize || 16
    
    // Относительные координаты (для масштабируемых карт)
    this.xRatio = options.xRatio !== undefined ? options.xRatio : null
    this.yRatio = options.yRatio !== undefined ? options.yRatio : null
    
    // Позиционирование через UINode
    if (options.x !== undefined) this.setX(options.x)
    if (options.y !== undefined) this.setY(options.y)
    
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
      fill: colors.ui.text.primary
    })
    this.textObj.anchor.set(0.5)
    this.addChild(this.textObj)
    
    this.updateDebug()
  }

  draw() {
    this.bg.clear()
    this.bg.lineStyle(this.borderWidth, this.borderColor)
    this.bg.beginFill(this.bgColor)
    this.bg.drawCircle(0, 0, this.radius)
    this.bg.endFill()
  }

  setText(text, animate = true) {
    const shouldAnimate = animate && String(this.text) !== String(text)
    
    this.text = text
    this.textObj.text = text
    
    if (shouldAnimate) {
      this.animatePulse()
    }
  }
  
  animatePulse() {
    const vx = this._visualX
    const vy = this._visualY
    
    const originalScale = 1
    const targetScale = 1.3
    let scale = originalScale
    
    const animate = () => {
      if (scale < targetScale) {
        scale += 0.1
        this.scale.set(scale)
        if (vx !== undefined) {
          this.x = vx + this.pivot.x * scale
          this.y = vy + this.pivot.y * scale
        }
        requestAnimationFrame(animate)
      } else {
        const animateBack = () => {
          if (scale > originalScale) {
            scale -= 0.1
            this.scale.set(scale)
            if (vx !== undefined) {
              this.x = vx + this.pivot.x * scale
              this.y = vy + this.pivot.y * scale
            }
            requestAnimationFrame(animateBack)
          } else {
            this.scale.set(originalScale)
            if (vx !== undefined) {
              this.x = vx + this.pivot.x
              this.y = vy + this.pivot.y
            }
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
    this.setSize(radius * 2, radius * 2)
    this.draw()
  }

  setSize(radius) {
    this.setRadius(radius)
  }

  setPosition(x, y) {
    this.setX(x)
    this.setY(y)
  }

  configure(options) {
    if (options.radius !== undefined) this.setRadius(options.radius)
    if (options.bgColor !== undefined) this.setBgColor(options.bgColor)
    if (options.borderColor !== undefined) this.setBorderColor(options.borderColor)
    if (options.text !== undefined) this.setText(options.text)
    if (options.x !== undefined) this.setX(options.x)
    if (options.y !== undefined) this.setY(options.y)
  }
}