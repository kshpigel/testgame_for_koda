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

    // Алтари всегда одинаковые (статичные, без разницы по статусу)
    sprite.alpha = 1
    sprite.tint = 0xFFFFFF
  }

  setStatus(status) {
    this.status = status
    this.updateStatus()
  }
}
