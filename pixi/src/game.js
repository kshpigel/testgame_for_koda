import * as PIXI from 'pixi.js'
import { Battle } from './battle.js'
import { MapScreen } from './map.js'
import { StartScreen } from './start_screen.js'
import { card_types } from './data/card_types.js'
import { deck } from './data/deck.js'
import { enemies } from './data/enemies.js'
import { maps } from './data/maps.js'
import { FONT } from './data/fonts.js'
import { soundManager } from './audio/sound_manager.js'

// Главный фон
const MAIN_BG = '/assets/img/bg_full.jpg'

export class Game {
  constructor(app) {
    this.app = app
    this.screens = {}
    this.currentScreen = null
    this.user = { points: 0 }
    this.isBattleActive = false

    // Контейнер для фона
    this.bgContainer = new PIXI.Container()
    this.app.stage.addChild(this.bgContainer)

    this.screenContainer = new PIXI.Container()
    this.app.stage.addChild(this.screenContainer)

    this.messageContainer = new PIXI.Container()
    this.app.stage.addChild(this.messageContainer)
    
    // Инициализация стартового экрана
    this.startScreen = new StartScreen(this.app, () => this.showMap())
    this.app.stage.addChild(this.startScreen.container)
    
    // Загрузка главного фона
    this.loadMainBg()
  }

  async loadMainBg() {
    try {
      this.mainBg = { texture: await PIXI.Assets.load(MAIN_BG) }
      this.renderMainBg()
    } catch (e) {
      console.warn('Failed to load main background:', e)
      this.renderMainBg()
    }
  }

  renderMainBg() {
    this.bgContainer.removeChildren()
    
    if (this.mainBg && this.mainBg.texture) {
      const bg = new PIXI.Sprite(this.mainBg.texture)
      this.scaleToCover(bg, this.app.screen.width, this.app.screen.height)
      this.bgContainer.addChild(bg)
    } else {
      // Резервный фон
      const bg = new PIXI.Graphics()
      bg.beginFill(0x1a1a2e)
      bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
      bg.endFill()
      this.bgContainer.addChild(bg)
    }
  }

  async start() {
    console.log('Game starting...', this.app.screen)
    
    // Показать стартовый экран
    await this.startScreen.init()
    this.startScreen.show()
    
    console.log('Start screen shown')
  }

  showMap() {
    this.isBattleActive = false
    this.hideCurrentScreen()
    soundManager.playMusic('mapBg')
    
    // Переиспользуем существующую карту или создаём новую со случайной картой
    let mapScreen = this.screens['map']
    if (!mapScreen) {
      const randomMap = maps[Math.floor(Math.random() * maps.length)]
      mapScreen = new MapScreen(this.app, randomMap, enemies, this)
      mapScreen.on('enemy_click', (enemyData) => this.initBattle(enemyData))
      this.screens['map'] = mapScreen
    }
    
    this.currentScreen = mapScreen
    mapScreen.show()
  }

  initBattle(enemyData) {
    this.isBattleActive = true
    this.hideCurrentScreen()
    soundManager.play('battleStart')
    soundManager.stopMusic()
    const battle = new Battle(this.app, deck, card_types, enemyData, this)
    
    battle.on('end', () => {
      this.isBattleActive = false
      // Обновляем карту после боя
      if (this.screens['map']) {
        this.screens['map'].disableCurrentEnemy()
      }
      this.showMap()
      soundManager.playMusic('mapBg')
    })
    
    battle.on('victory', (points) => {
      this.user.points += points
      this.showMessage(`Победа! +${points} очков`, 0x00ff00)
    })
    
    battle.on('defeat', () => {
      this.showMessage('Поражение!', 0xff0000)
    })
    
    this.screens['battle'] = battle
    this.currentScreen = battle
    battle.start()
    
    // Добавляем кнопку выхода после загрузки ассетов
    battle.on('ready', () => {
      console.log('Battle ready, adding exit button')
      this.addExitButton(battle)
    })
  }

  addExitButton(battle) {
    // Кнопка "Сбежать"
    const exitBtn = new PIXI.Container()
    
    const bg = new PIXI.Graphics()
    bg.beginFill(0x8c1300)
    bg.drawRoundedRect(0, 0, 120, 40, 20)
    bg.endFill()
    exitBtn.addChild(bg)
    
    const label = new PIXI.Text('Сбежать', {
      fontFamily: FONT,
      fontSize: 16,
      fill: '#ffffff'
    })
    label.anchor.set(0.5)
    label.x = 60
    label.y = 20
    exitBtn.addChild(label)
    
    exitBtn.x = this.app.screen.width - 140
    exitBtn.y = 20
    exitBtn.eventMode = 'static'
    exitBtn.cursor = 'pointer'
    
    exitBtn.on('pointerover', () => {
      bg.clear()
      bg.beginFill(0xa52a2a)
      bg.drawRoundedRect(0, 0, 120, 40, 20)
      bg.endFill()
    })
    
    exitBtn.on('pointerout', () => {
      bg.clear()
      bg.beginFill(0x8c1300)
      bg.drawRoundedRect(0, 0, 120, 40, 20)
      bg.endFill()
    })
    
    exitBtn.on('pointerdown', () => {
      battle.cleanup()
      this.isBattleActive = false
      this.showMap()
    })
    
    battle.container.addChild(exitBtn)
  }

  hideCurrentScreen() {
    if (this.currentScreen) {
      this.currentScreen.hide()
    }
  }

  showMessage(text, color = 0xffffff) {
    const style = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 36,
      fontWeight: 'bold',
      fill: color,
      stroke: '#000000',
      strokeThickness: 4
    })

    const message = new PIXI.Text(text, style)
    message.anchor.set(0.5)
    message.x = this.app.screen.width / 2
    message.y = this.app.screen.height / 2
    this.messageContainer.addChild(message)

    let alpha = 1
    const fadeOut = () => {
      alpha -= 0.02
      message.alpha = alpha
      if (alpha <= 0) {
        this.messageContainer.removeChild(message)
        message.destroy()
      } else {
        requestAnimationFrame(fadeOut)
      }
    }
    setTimeout(fadeOut, 2000)
  }

  resize(width, height) {
    this.renderMainBg()
    if (this.startScreen && this.startScreen.resize) {
      this.startScreen.resize(width, height)
    }
    if (this.currentScreen && this.currentScreen.resize) {
      this.currentScreen.resize(width, height)
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
