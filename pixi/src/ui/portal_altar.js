import * as PIXI from 'pixi.js'
import { UINode } from './ui_node.js'

export class PortalAltar extends UINode {
  constructor(options = {}) {
    super({
      width: options.width || 75,
      height: options.height || 75,
      app: options.app || null,
      scaleSpeed: 0.15
    })

    this.texture = options.texture || null
    this.portalType = options.portalType || 'random'
    this.status = options.status || 'active' // 'active', 'locked', 'growing'
    
    this.create()
    this.updateDebug()
  }

  create() {
    if (this.texture) {
      const altar = new PIXI.Sprite(this.texture)
      altar.anchor.set(0.5)
      const scale = Math.min(
        this.width / altar.texture.width,
        this.height / altar.texture.height
      )
      altar.scale.set(scale)
      altar.name = 'altarSprite'
      this.addChild(altar)
    } else {
      // Заглушка - серый круг
      const altar = new PIXI.Graphics()
      altar.beginFill(0x888888, 0.5)
      altar.drawEllipse(0, 0, this.width / 2, this.height / 2)
      altar.endFill()
      altar.name = 'altarSprite'
      this.addChild(altar)
    }

    // Обновляем статус (цвет/прозрачность)
    this.updateStatus()
  }

  updateStatus() {
    const sprite = this.getChildByName('altarSprite')
    if (!sprite) return

    switch (this.status) {
      case 'active':
        sprite.alpha = 1
        sprite.tint = 0xFFFFFF
        break
      case 'locked':
        sprite.alpha = 0.4
        sprite.tint = 0x555555
        break
      case 'growing':
        sprite.alpha = 0.6
        sprite.tint = 0xAAAAAA
        break
      default:
        sprite.alpha = 1
        sprite.tint = 0xFFFFFF
    }
  }

  setStatus(status) {
    this.status = status
    this.updateStatus()
  }
}
