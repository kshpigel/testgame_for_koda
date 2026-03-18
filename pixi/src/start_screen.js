import * as PIXI from 'pixi.js'
import { Button } from './ui/button.js'
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
    this.button = null
    this.loadingText = null
    this.isLoading = false
  }

  async init() {
    // Ждём загрузки шрифта перед созданием UI
    await document.fonts.ready
    await this.loadBg()
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
      if (this.isLoading) return
      this.isLoading = true
      // Разогрев AudioContext при первом клике (если уже инициализирован)
      if (soundManager.audioCtx) {
        soundManager.audioCtx.resume()
        soundManager.play('click')
      }
      this.button.visible = false
      this.loadingText.text = 'Загрузка...'
      this.loadingText.visible = true
      if (this.onStart) this.onStart()
    }
    
    this.container.addChild(this.button)
  }

  createLoadingText() {
    this.loadingText = new PIXI.Text('', {
      fontFamily: FONT,
      fontSize: 24,
      fill: colors.ui.text.primary,
      align: 'center'
    })
    this.loadingText.anchor.set(0.5)
    this.loadingText.x = this.app.screen.width / 2
    this.loadingText.y = this.app.screen.height / 2 + 100
    this.loadingText.visible = false
    this.container.addChild(this.loadingText)
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
    soundManager.playMusic('musicBg')
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
    // Не пересоздаём - только пересчитываем позиции кнопки и текста
    if (this.button) {
      this.button.x = this.app.screen.width / 2
      this.button.y = this.app.screen.height / 2
    }
    if (this.loadingText) {
      this.loadingText.x = this.app.screen.width / 2
      this.loadingText.y = this.app.screen.height / 2 + 100
    }
  }
}
