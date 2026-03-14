import * as PIXI from 'pixi.js'

const START_BG = '/assets/img/bg_full.jpg'

export class StartScreen {
  constructor(app, onStart) {
    this.app = app
    this.onStart = onStart
    this.container = new PIXI.Container()
    this.container.visible = false
  }

  async init() {
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
    const button = new PIXI.Container()
    button.x = this.app.screen.width / 2
    button.y = this.app.screen.height / 2
    button.eventMode = 'static'
    button.cursor = 'pointer'

    // Фон кнопки
    const bg = new PIXI.Graphics()
    bg.beginFill(0x4a9c6d)
    bg.lineStyle(3, 0x2d5a3d)
    bg.drawRoundedRect(-120, -40, 240, 80, 15)
    bg.endFill()
    button.addChild(bg)

    // Текст кнопки
    const text = new PIXI.Text('Играть', {
      fontFamily: 'Arial',
      fontSize: 32,
      fontWeight: 'bold',
      fill: 0xffffff
    })
    text.anchor.set(0.5)
    button.addChild(text)

    // Hover эффект
    button.on('pointerover', () => {
      bg.clear()
      bg.beginFill(0x5cb87d)
      bg.lineStyle(3, 0x3d7a5d)
      bg.drawRoundedRect(-120, -40, 240, 80, 15)
      bg.endFill()
      button.scale.set(1.05)
    })

    button.on('pointerout', () => {
      bg.clear()
      bg.beginFill(0x4a9c6d)
      bg.lineStyle(3, 0x2d5a3d)
      bg.drawRoundedRect(-120, -40, 240, 80, 15)
      bg.endFill()
      button.scale.set(1)
    })

    button.on('pointerdown', () => {
      this.container.visible = false
      if (this.onStart) this.onStart()
    })

    this.container.addChild(button)
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
    // Перерисовать при ресайзе
    this.container.removeChildren()
    this.loadBg()
    this.createButton()
  }
}
