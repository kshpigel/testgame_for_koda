import * as PIXI from 'pixi.js'
import { Button } from './ui/button.js'
import { Layout } from './ui/layout.js'
import { soundManager } from './audio/sound_manager.js'
import { FONT } from './data/fonts.js'
import { colors } from './data/colors.js'

const START_BG = '/assets/img/bg_full.jpg'

export class StartScreen {
  constructor(app, onStart) {
    this.app = app
    this.onStart = onStart
    this.container = new PIXI.Container()
    this.container.visible = false
    this.titleText = null
    this.button = null
    this.loadingText = null
    this.isLoading = false
    this.mainLayout = null
  }

  async init() {
    await document.fonts.ready
    await this.loadBg()
    this.createLayouts()
    this.createTitle()
    this.createButton()
    this.createLoadingText()
  }

  async loadBg() {
    const bg = new PIXI.Graphics()
    bg.beginFill(colors.background.battle)
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

  createLayouts() {
    // Главный layout - column, занимает весь экран, растянуть
    this.mainLayout = new Layout({
      direction: 'column',
      justify: 'center',
      gap: 10,
      width: this.app.screen.width,
      height: this.app.screen.height
    })
    this.mainLayout.x = 0
    this.mainLayout.y = 0
    this.mainLayout.setSize(this.app.screen.width, this.app.screen.height)
    this.container.addChild(this.mainLayout)

    // Layout для заголовка (row, по центру)
    this.titleLayout = new Layout({
      direction: 'row',
      justify: 'center',
      gap: 0,
      width: 'auto',
      height: 'auto'
    })
    this.mainLayout.add(this.titleLayout, { flex: 0, stretch: true })

    // Layout для кнопки (row, по центру)
    this.buttonLayout = new Layout({
      direction: 'row',
      justify: 'center',
      gap: 0,
      width: 'auto',
      height: 'auto'
    })
    this.mainLayout.add(this.buttonLayout, { flex: 0, stretch: true })

    // Layout для текста загрузки (row, по центру)
    this.loadingLayout = new Layout({
      direction: 'row',
      justify: 'center',
      gap: 0,
      width: 'auto',
      height: 'auto'
    })
    this.mainLayout.add(this.loadingLayout, { flex: 0, stretch: true })
  }

  createTitle() {
    this.titleText = new PIXI.Text('Начать игру!', {
      fontFamily: FONT,
      fontSize: 48,
      fontWeight: 'bold',
      fill: colors.ui.text.primary,
      align: 'center'
    })
    this.titleText.anchor.set(0.5)
    this.titleLayout.add(this.titleText, { flex: 0 })
  }

  createButton() {
    this.button = new Button('Старт', {
      width: 280,
      height: 90,
      fontSize: 32,
      app: this.app
    })

    this.button.onClick = () => {
      if (this.isLoading) return
      this.isLoading = true
      if (soundManager.audioCtx) {
        soundManager.audioCtx.resume()
        soundManager.play('click')
      }
      this.button.visible = false
      this.loadingText.text = 'Загрузка...'
      this.loadingText.visible = true
      if (this.onStart) this.onStart()
    }

    this.buttonLayout.add(this.button, { flex: 0 })
  }

  createLoadingText() {
    this.loadingText = new PIXI.Text('', {
      fontFamily: FONT,
      fontSize: 24,
      fill: colors.ui.text.primary,
      align: 'center'
    })
    this.loadingText.anchor.set(0.5)
    this.loadingText.visible = false
    this.loadingLayout.add(this.loadingText, { flex: 0 })
  }

  setLoadingText(text) {
    if (this.loadingText) {
      this.loadingText.text = text
    }
  }

  show() {
    this.isLoading = false
    this.button.visible = true
    this.loadingText.visible = false
    this.container.visible = true

    if (this.mainLayout) {
      this.mainLayout.setSize(this.app.screen.width, this.app.screen.height)
    }
  }

  scaleToCover(sprite, targetWidth, targetHeight) {
    const scaleX = targetWidth / sprite.texture.width
    const scaleY = targetHeight / sprite.texture.height
    const scale = Math.max(scaleX, scaleY)
    sprite.scale.set(scale)
    sprite.x = (targetWidth - sprite.texture.width * scale) / 2
    sprite.y = (targetHeight - sprite.texture.height * scale) / 2
  }

  resize(width, height, scale = 1) {
    if (this.mainLayout) {
      this.mainLayout.setSize(width, height)
    }
  }
}
