import * as PIXI from 'pixi.js'
import { Button } from './ui/button.js'

const START_BG = '/assets/img/bg_full.jpg'

export class StartScreen {
  constructor(app, onStart) {
    this.app = app
    this.onStart = onStart
    this.container = new PIXI.Container()
    this.container.visible = false
    this.button = null
  }

  async init() {
    // Ждём загрузки шрифта перед созданием UI
    await document.fonts.ready
    await this.loadBg()
    this.createButton()
  }

  async loadBg() {
    const bg = new PIXI.Graphics()
    bg.beginFill(0x1a1a2e)
    bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    bg.endFill()
    this.container.addChild(bg)

    try {
      const texture = await PIXI.Assets.load(START_BG)
      const bgSprite = new PIXI.Sprite(texture)
      this.scaleToCover(bgSprite, this.app.screen.width, this.app.screen.height)
      this.container.addChild(bgSprite)
    } catch (e) {
      console.warn('Failed to load start screen bg:', e)
    }
  }

  createButton() {
    this.button = new Button('Играть', {
      width: 280,
      height: 90,
      fontSize: 32,
      app: this.app
    })
    
    this.button.x = this.app.screen.width / 2
    this.button.y = this.app.screen.height / 2
    this.button.onClick = () => {
      this.container.visible = false
      if (this.onStart) this.onStart()
    }
    
    this.container.addChild(this.button)
  }

  show() {
    this.container.visible = true
  }

  scaleToCover(sprite, targetWidth, targetHeight) {
    const scaleX = targetWidth / sprite.texture.width
    const scaleY = targetHeight / sprite.texture.height
    const scale = Math.max(scaleX, scaleY)
    sprite.scale.set(scale)
    sprite.x = (targetWidth - sprite.texture.width * scale) / 2
    sprite.y = (targetHeight - sprite.texture.height * scale) / 2
  }

  resize(width, height) {
    this.container.removeChildren()
    this.loadBg()
    this.createButton()
  }
}
