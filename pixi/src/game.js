import * as PIXI from 'pixi.js'
import { Battle } from './battle.js'
import { MapScreen } from './map.js'
import { StartScreen } from './start_screen.js'
import { BaseScreen } from './base_screen.js'
import { card_types } from './data/card_types/index.js'
import { getDeckByCode, deck as defaultDeck } from './data/deck.js'
import { player } from './data/player.js'
import { enemies as allEnemies } from './data/enemies/index.js'
import { config, log } from './data/config.js'
import { maps } from './data/maps.js'
import { FONT } from './data/fonts.js'
import { colors } from './data/colors.js'
import { GAME_VERSION } from './data/version.js'
import { soundManager } from './audio/sound_manager.js'
import { Button } from './ui/button.js'

// Главный фон
const MAIN_BG = '/assets/img/bg_full.jpg'

export class Game {
  constructor(app) {
    this.app = app
    this.screens = {}
    this.currentScreen = null
    this.isBattleActive = false
    this.loadingCallback = null
    this.completedPortals = [] // IDs пройденных порталов

    // Контейнер для фона
    this.bgContainer = new PIXI.Container()
    this.app.stage.addChild(this.bgContainer)

    this.screenContainer = new PIXI.Container()
    this.app.stage.addChild(this.screenContainer)

    this.messageContainer = new PIXI.Container()
    this.app.stage.addChild(this.messageContainer)
    
    // Инициализация стартового экрана (без init - будет вызвано при показе)
    this.startScreen = new StartScreen(this.app, () => this.runLoading())
    this.app.stage.addChild(this.startScreen.container)
    
    // Загрузка главного фона
    this.loadMainBg()
    
    // Версия игры
    this.versionText = null
    this.showVersion()
  }

  setLoadingCallback(callback) {
    this.loadingCallback = callback
  }

  async runLoading() {
    if (this.loadingCallback) {
      await this.loadingCallback()
    }
  }

  async showStartScreen() {
    // Инициализируем стартовый экран и показываем
    await this.startScreen.init()
    this.startScreen.show()
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
      bg.beginFill(colors.background.battle)
      bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
      bg.endFill()
      this.bgContainer.addChild(bg)
    }
  }

  async start() {
    log('Game starting after loading...')
    
    // Загрузка завершена - показываем базу
    this.showBase()
  }

  showBase() {
    log('[Game] showBase() called, completedPortals:', [...this.completedPortals])
    this.hideCurrentScreen()
    soundManager.stopMusic()
    
    // Удаляем старую карту, чтобы создать новую
    if (this.screens['map']) {
      this.screens['map'].cleanup()
      delete this.screens['map']
    }
    
    // Переиспользуем baseScreen или создаём новый
    let baseScreen = this.screens['base']
    if (!baseScreen) {
      log('[Game] Creating NEW BaseScreen')
      baseScreen = new BaseScreen(this.app)
      baseScreen.on('start_game', (portalId) => this.showMap(portalId))
      this.screens['base'] = baseScreen
    } else {
      log('[Game] Reusing existing BaseScreen')
    }
    
    // Передаём список пройденных порталов
    log('[Game] Calling baseScreen.init with:', [...this.completedPortals])
    baseScreen.init(this.completedPortals || [])
    this.currentScreen = baseScreen
  }

  showMap(portalId) {
    this.isBattleActive = false
    this.hideCurrentScreen()
    soundManager.playMusic('mapBg')
    
    // Переиспользуем существующую карту или создаём новую со случайной картой
    let mapScreen = this.screens['map']
    if (!mapScreen) {
      const randomMap = maps[Math.floor(Math.random() * maps.length)]
      // Ограничиваем количество врагов для тестирования
      const enemies = allEnemies.slice(0, config.enemiesCount || allEnemies.length)
      mapScreen = new MapScreen(this.app, randomMap, enemies, this)
      mapScreen.on('enemy_click', (enemyData) => this.initBattle(enemyData))
      mapScreen.on('exit_to_base', () => this.showBase())
      this.screens['map'] = mapScreen
    }
    
    // Сохраняем portalId — не перезаписываем если уже установлен
    if (portalId !== undefined) {
      mapScreen.portalId = portalId
    }
    this.currentScreen = mapScreen
    mapScreen.show()
  }

  initBattle(enemyData) {
    this.isBattleActive = true
    this.hideCurrentScreen()
    soundManager.play('battleStart')
    soundManager.stopMusic()
    soundManager.playMusic('battleBg')
    
    // Получаем колоду по коду игрока
    const playerDeck = getDeckByCode(player.deckCode)
    const battle = new Battle(this.app, playerDeck.cards, card_types, enemyData, this)
    
    battle.on('end', () => {
      this.isBattleActive = false
      // Обновляем карту после боя
      if (this.screens['map']) {
        this.screens['map'].disableCurrentEnemy()
        
        // Если это был последний враг - возвращаемся на базу
        if (this.screens['map'].isLastEnemyDefeated()) {
          player.addMap(1) // +1 пройденый портал
          const portalId = this.screens['map'].portalId
          log('[Game] === VICTORY OVER BOSS ===')
          log('[Game] portalId:', portalId)
          log('[Game] completedPortals BEFORE:', [...this.completedPortals])
          if (portalId && !this.completedPortals.includes(portalId)) {
            this.completedPortals.push(portalId)
          }
          log('[Game] completedPortals AFTER:', [...this.completedPortals])
          log('[Game] calling showBase()...')
          this.showBase()
          log('[Game] showBase() done')
          return
        }
      }
      this.showMap()
      soundManager.playMusic('mapBg')
    })
    
    battle.on('victory', (points) => {
      const gold = Math.floor(points * 0.75)
      const crystals = Math.floor(points * 0.25)
      player.addGold(gold)
      player.addCrystals(crystals)
      player.addWin()
      this.showMessage(`Победа! +${gold}💰 +${crystals}💎`, colors.ui.text.victory)
    })
    
    battle.on('defeat', async () => {
      this.showMessage('Поражение!', colors.ui.text.defeat)
      // Ждём завершения анимации поражения
      await new Promise(r => setTimeout(r, 1500))
      // Возврат на базу и удаление карты (как при победе над последним врагом)
      this.isBattleActive = false
      if (this.screens['map']) {
        this.screens['map'].cleanup()
        delete this.screens['map']
      }
      this.showBase()
    })
    
    this.screens['battle'] = battle
    this.currentScreen = battle
    battle.start()
    
    // Добавляем кнопку выхода после загрузки ассетов
    battle.on('ready', () => {
      log('Battle ready, adding exit button')
      this.addExitButton(battle)
    })
  }

  addExitButton(battle) {
    // Кнопка "Сбежать"
    const exitBtn = new Button('Сбежать', {
      width: 120,
      height: 40,
      color: colors.ui.button.exit,
      fontSize: 16,
      app: this.app,
      onClick: () => {
        battle.cleanup()
        this.isBattleActive = false
        this.showMap()
      }
    })
    
    exitBtn.x = this.app.screen.width - 140
    exitBtn.y = 50
    
    battle.container.addChild(exitBtn)
  }

  hideCurrentScreen() {
    if (this.currentScreen) {
      this.currentScreen.hide()
    }
  }

  showMessage(text, color = colors.ui.text.primary) {
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

  showVersion() {
    this.versionText = new PIXI.Text(`v${GAME_VERSION}`, {
      fontFamily: FONT,
      fontSize: 12,
      fill: '#ffffff',
      alpha: 0.5
    })
    this.versionText.anchor.set(1, 1)
    this.versionText.x = this.app.screen.width - 10
    this.versionText.y = this.app.screen.height - 10
    this.app.stage.addChild(this.versionText)
  }

  resize(width, height, scale = 1) {
    this.renderMainBg()
    if (this.startScreen && this.startScreen.resize) {
      this.startScreen.resize(width, height, scale)
    }
    if (this.currentScreen && this.currentScreen.resize) {
      this.currentScreen.resize(width, height, scale)
    }
    // Обновляем позицию версии
    if (this.versionText) {
      this.versionText.x = this.app.screen.width - 10
      this.versionText.y = this.app.screen.height - 10
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
