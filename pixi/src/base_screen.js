import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { EventEmitter } from 'events'
import { FONT } from './data/fonts.js'
import { colors } from './data/colors.js'
import { soundManager } from './audio/sound_manager.js'
import { player } from './data/player.js'

const ASSETS = {
  bg: '/assets/img/base_bg.png',
  base: '/assets/img/base.png',
  portal: '/assets/img/portal.png'
}

export class BaseScreen extends EventEmitter {
  constructor(app) {
    super()
    this.app = app
    this.container = new PIXI.Container()
    this.assets = {}
  }

  async init() {
    await this.loadAssets()
    this.render()
    this.app.stage.addChild(this.container)
    this.container.alpha = 0
    this.fadeIn()
  }

  async loadAssets() {
    const urls = Object.values(ASSETS)
    await PIXI.Assets.load(urls)
    
    this.assets = {}
    for (const [key, url] of Object.entries(ASSETS)) {
      this.assets[key] = { texture: PIXI.Assets.get(url) }
    }
  }

  render() {
    this.container.removeChildren()

    // Фон (cover)
    if (this.assets.bg && this.assets.bg.texture) {
      const bg = new PIXI.Sprite(this.assets.bg.texture)
      this.scaleToCover(bg, this.app.screen.width, this.app.screen.height)
      this.container.addChild(bg)
    } else {
      const bg = new PIXI.Graphics()
      bg.beginFill(colors.background.map)
      bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
      bg.endFill()
      this.container.addChild(bg)
    }

    // База (по центру горизонтально, 2/3 сверху)
    if (this.assets.base && this.assets.base.texture) {
      this.base = new PIXI.Sprite(this.assets.base.texture)
      this.base.anchor.set(0.5, 1)
      this.base.x = this.app.screen.width / 2
      this.base.y = this.app.screen.height * 0.76
      // Масштабируем до 300x300
      const targetW = 220
      const targetH = 220
      const scale = Math.min(
        targetW / this.base.texture.width,
        targetH / this.base.texture.height
      )
      this.base.scale.set(scale)
      this.base.eventMode = 'static'
      this.base.cursor = 'pointer'
      
      // Glow эффект для базы
      const baseGlow = new ColorMatrixFilter()
      baseGlow.brightness(1.3, false)
      
      this.base.on('pointerover', () => {
        this.base.filters = [baseGlow]
        soundManager.play('hover')
      })
      
      this.base.on('pointerout', () => {
        this.base.filters = null
      })
      
      this.container.addChild(this.base)
    }

    // Портал - 7/10 по горизонтали, 3/10 по вертикали
    this.createPortal()
    
    // Информация об игроке (левый верхний угол)
    this.createPlayerInfo()
  }

  createPlayerInfo() {
    const padding = 10
    const fontSize = 14
    const lineHeight = 18
    
    const text1 = new PIXI.Text(player.name, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: colors.ui.text.primary
    })
    
    const text2 = new PIXI.Text(`💰 ${player.gold}`, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: colors.ui.text.gold
    })
    
    const text3 = new PIXI.Text(`💎 ${player.crystals}`, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: colors.ui.text.crystals
    })
    
    // Фон
    const totalWidth = text1.width + text2.width + text3.width + padding * 4
    const height = lineHeight + padding * 2
    
    const bg = new PIXI.Graphics()
    bg.beginFill(0x000000, 0.25)
    bg.drawRoundedRect(0, 0, totalWidth, height, 8)
    bg.endFill()
    bg.x = 10
    bg.y = 10
    this.container.addChild(bg)
    
    // Размещаем горизонтально
    text1.x = padding
    text1.y = padding
    
    text2.x = padding + text1.width + 20
    text2.y = padding
    
    text3.x = padding + text1.width + text2.width + 40
    text3.y = padding
    
    this.container.addChild(text1, text2, text3)
    
    this.playerInfoContainer = bg
  }

  createPortal() {
    const portalContainer = new PIXI.Container()
    portalContainer.x = this.app.screen.width * 0.8
    portalContainer.y = this.app.screen.height * 0.4
    portalContainer.eventMode = 'static'
    portalContainer.cursor = 'pointer'
    portalContainer.targetScale = 1

    // Если есть картинка портала
    if (this.assets.portal && this.assets.portal.texture) {
      const portal = new PIXI.Sprite(this.assets.portal.texture)
      portal.anchor.set(0.5)
      // Масштабируем до 200x200
      const targetW = 200
      const targetH = 200
      const scale = Math.min(
        targetW / portal.texture.width,
        targetH / portal.texture.height
      )
      portal.scale.set(scale)
      portalContainer.addChild(portal)
    } else {
      // Заглушка - зелёный круг 200x200
      const portal = new PIXI.Graphics()
      portal.beginFill(0x00ff00, 0.7)
      portal.drawCircle(0, 0, 100)
      portal.endFill()
      portalContainer.addChild(portal)

      const label = new PIXI.Text('ПОРТАЛ', {
        fontFamily: FONT,
        fontSize: 16,
        fontWeight: 'bold',
        fill: '#ffffff'
      })
      label.anchor.set(0.5)
      label.y = 60
      portalContainer.addChild(label)
    }

    // Анимация при наведении - эффект свечения + scale
    const glowFilter = new ColorMatrixFilter()
    glowFilter.brightness(1.3, false)
    
    portalContainer.on('pointerover', () => {
      portalContainer.targetScale = 1.1
      if (portalContainer.children[0]) {
        portalContainer.children[0].filters = [glowFilter]
      }
      soundManager.play('hover')
    })

    portalContainer.on('pointerout', () => {
      portalContainer.targetScale = 1
      if (portalContainer.children[0]) {
        portalContainer.children[0].filters = null
      }
    })

    portalContainer.on('pointerdown', () => {
      soundManager.play('click')
      this.emit('start_game')
    })

    this.container.addChild(portalContainer)
    this.portalContainer = portalContainer
  }

  fadeIn() {
    // Останавливаем музыку карты и запускаем музыку базы
    soundManager.stopMusic()
    soundManager.playMusic('baseBg')
    
    const animate = () => {
      this.container.alpha += 0.05
      if (this.container.alpha < 1) {
        requestAnimationFrame(animate)
      }
    }
    animate()
    this.app.ticker.add(() => this.update())
  }

  hide() {
    this.app.ticker.remove(() => this.update())
    const animate = () => {
      this.container.alpha -= 0.05
      if (this.container.alpha <= 0) {
        this.app.stage.removeChild(this.container)
      } else {
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  update() {
    if (this.portalContainer) {
      const diff = this.portalContainer.targetScale - this.portalContainer.scale.x
      if (Math.abs(diff) > 0.001) {
        this.portalContainer.scale.set(this.portalContainer.scale.x + diff * 0.15)
      }
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
}
