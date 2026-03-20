import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { soundManager } from '../audio/sound_manager.js'

export class Portal extends PIXI.Container {
  constructor(options = {}) {
    super()

    this.texture = options.texture || null
    this.scale_ = options.scale || 1
    this.width_ = options.width || 200
    this.height_ = options.height || 200
    this.onClick = options.onClick || null

    this.targetScale = 1
    this.baseScale = 1
    this.targetBrightness = 1
    
    // Мерцание (замедленное в 3 раза)
    this.wobbleOffset = Math.random() * Math.PI * 2
    this.wobbleSpeed = 0.007
    this.wobbleAmount = 0.03 // 3% scale амплитуда
    
    this.glowFilter = new ColorMatrixFilter()
    this.glowFilter.brightness(1.5, false)

    this.create()
    this.setupInteraction()
  }

  create() {
    // Портал
    if (this.texture) {
      const portal = new PIXI.Sprite(this.texture)
      portal.anchor.set(0.5)
      const scale = Math.min(
        this.width_ / portal.texture.width,
        this.height_ / portal.texture.height
      )
      portal.scale.set(scale)
      portal.name = 'portalSprite'
      this.addChild(portal)
    } else {
      // Заглушка
      const portal = new PIXI.Graphics()
      portal.beginFill(0x00ff00, 0.7)
      portal.drawCircle(0, 0, this.width_ / 2)
      portal.endFill()
      portal.name = 'portalSprite'
      this.addChild(portal)

      const label = new PIXI.Text('ПОРТАЛ', {
        fontFamily: FONT,
        fontSize: 16,
        fontWeight: 'bold',
        fill: '#ffffff'
      })
      label.anchor.set(0.5)
      label.y = this.height_ / 2 + 20
      this.addChild(label)
    }

    this.scale.set(this.scale_)
  }

  setupInteraction() {
    this.eventMode = 'static'
    this.cursor = 'pointer'

    this.on('pointerover', () => {
      this.targetScale = 1.05
      this.targetBrightness = 1.5
      soundManager.play('hover')
    })

    this.on('pointerout', () => {
      this.targetScale = 1
      this.targetBrightness = 1
      // Не сбрасываем baseScale - анимация сама плавно уменьшит
    })

    this.on('pointerdown', () => {
      soundManager.play('click')
      if (this.onClick) this.onClick()
    })
  }

  update() {
    // Scale анимация (базовый scale без wobble)
    const diff = this.targetScale - this.baseScale
    if (Math.abs(diff) > 0.001) {
      this.baseScale = this.baseScale + diff * 0.15
    } else {
      this.baseScale = this.targetScale
    }

    // Мерцание
    this.wobbleOffset += this.wobbleSpeed
    const wobble = Math.sin(this.wobbleOffset) * this.wobbleAmount
    const finalScale = this.baseScale * (1 + wobble)
    this.scale.set(finalScale)

    // Brightness анимация (плавная)
    const brightnessDiff = this.targetBrightness - (this.glowFilter.brightness || 1)
    if (Math.abs(brightnessDiff) > 0.01) {
      const newBrightness = (this.glowFilter.brightness || 1) + brightnessDiff * 0.1
      this.glowFilter.brightness(newBrightness, false)
    }

    // Применяем фильтр
    const portalSprite = this.getChildByName('portalSprite')
    if (portalSprite) {
      if (this.targetBrightness > 1 || Math.abs(this.glowFilter.brightness - 1) > 0.01) {
        portalSprite.filters = [this.glowFilter]
      } else {
        portalSprite.filters = null
      }
    }
  }
}
