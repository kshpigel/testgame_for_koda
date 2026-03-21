import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { soundManager } from '../audio/sound_manager.js'
import { config } from '../data/config.js'
import { UINode } from './ui_node.js'

export class Portal extends UINode {
  constructor(options = {}) {
    super({
      width: options.width || 200,
      height: options.height || 200,
      app: options.app || null,
      scaleSpeed: 0.15
    })

    this.texture = options.texture || null
    this.onClick = options.onClick || null
    
    this.targetBrightness = 1
    
    // Мерцание (замедленное в 3 раза)
    this.wobbleOffset = Math.random() * Math.PI * 2
    this.wobbleSpeed = 0.007
    this.wobbleAmount = 0.03 // 3% scale амплитуда
    
    this.glowFilter = new ColorMatrixFilter()
    this.glowFilter.brightness(1.5, false)

    this.create()
    this.setupInteraction()
    
    // Debug рамка
    this.updateDebug()
  }

  create() {
    // Портал
    if (this.texture) {
      const portal = new PIXI.Sprite(this.texture)
      portal.anchor.set(0.5)
      const scale = Math.min(
        this.width / portal.texture.width,
        this.height / portal.texture.height
      )
      portal.scale.set(scale)
      portal.name = 'portalSprite'
      this.addChild(portal)
    } else {
      // Заглушка
      const portal = new PIXI.Graphics()
      portal.beginFill(0x00ff00, 0.7)
      portal.drawCircle(0, 0, this.width / 2)
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
      label.y = this.height / 2 + 20
      this.addChild(label)
    }
  }

  setupInteraction() {
    this.eventMode = 'static'
    this.cursor = 'pointer'

    this.on('pointerover', () => {
      this.setScale(1.05)
      this.targetBrightness = 1.5
      soundManager.play('hover')
    })

    this.on('pointerout', () => {
      this.setScale(1)
      this.targetBrightness = 1
    })

    this.on('pointerdown', () => {
      soundManager.play('click')
      if (this.onClick) this.onClick()
    })
  }

  // Alias для совместимости с base_screen
  update() {
    this.updateScale()
  }
  
  // Переопределяем updateScale для добавления wobble эффекта
  updateScale() {
    // Сначала базовый scale от UINode (включая компенсацию позиции)
    super.updateScale()
    
    // Мерцание добавляется к финальному scale
    this.wobbleOffset += this.wobbleSpeed
    const wobble = Math.sin(this.wobbleOffset) * this.wobbleAmount
    const finalScale = this._scale * (1 + wobble)
    
    // Применяем scale с учетом компенсации позиции
    this.scale.set(finalScale)
    // Обновляем позицию с учетом нового scale
    if (this._visualX !== undefined) {
      this.x = this._visualX + this.pivot.x * finalScale
      this.y = this._visualY + this.pivot.y * finalScale
    }

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