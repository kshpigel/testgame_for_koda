import * as PIXI from 'pixi.js'
import { Battle } from './battle.js'
import { MapScreen } from './map.js'
import { StartScreen } from './start_screen.js'
import { BaseScreen } from './base_screen.js'
import { card_types } from './data/card_types/index.js'
import { getDeckByCode, deck as defaultDeck } from './data/deck.js'
import { player } from './data/player.js'
import { collectionManager } from './data/collection_manager.js'
import { deckManager } from './data/deck_manager.js'
import { enemies as allEnemies, initEnemies } from './data/enemies/index.js'
import { config, log } from './data/config.js'
import { portalManager } from './data/portal_manager.js'
import { Z } from './data/z_index.js'
import { maps } from './data/maps.js'
import { FONT } from './data/fonts.js'
import { colors } from './data/colors.js'
import { GAME_VERSION } from './data/version.js'
import { soundManager } from './audio/sound_manager.js'
import { battleStats } from './data/battle_stats.js'
import { Button } from './ui/button.js'
import { Dialog } from './ui/dialog.js'
import { gameConfig } from './data/game_config.js'
import { playerUI } from './ui/player_ui.js'
import { Modal } from './ui/modal.js'
import { t } from './data/i18n.js'

// Главный фон
const MAIN_BG = '/assets/img/bg_full.jpg'

export class Game {
  constructor(app) {
    this.app = app
    this.app.stage.sortableChildren = true
    
    this.screens = {}
    this.currentScreen = null
    this.isBattleActive = false
    this.loadingCallback = null
    this.completedPortals = [] // IDs пройденных порталов

    // Контейнер для фона
    this.bgContainer = new PIXI.Container()
    this.bgContainer.zIndex = Z.BG_START - 1 // Под фоном старта
    this.app.stage.addChild(this.bgContainer)

    this.screenContainer = new PIXI.Container()
    this.screenContainer.zIndex = Z.BG_BASE
    this.app.stage.addChild(this.screenContainer)

    this.messageContainer = new PIXI.Container()
    this.messageContainer.zIndex = Z.UI
    this.app.stage.addChild(this.messageContainer)
    
    // Контейнер для debug (поверх всех экранов)
    this.debugContainer = new PIXI.Container()
    this.debugContainer.zIndex = Z.DEBUG
    this.app.stage.addChild(this.debugContainer)

    // Диалог (глобальный)
    this.dialog = new Dialog(this.app, this.app.stage)
    
    // Глобальный тикер для PortalManager (рост порталов в фоне)
    this._portalTicker = () => this.updatePortals()
    this.app.ticker.add(this._portalTicker)
    
    // Инициализация стартового экрана (без init - будет вызвано при показе)
    this.startScreen = new StartScreen(this.app, () => this.runLoading())
    this.startScreen.container.zIndex = Z.BG_START
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
    
    // Debug сетка рисуется в messageContainer (поверх всех экранов)
    if (config.debug) {
      this.drawDebugGrid()
    }
  }
  
  drawDebugGrid() {
    if (!config.debug) return
    
    // Удаляем старую сетку из stage
    const oldGrid = this.app.stage.getChildByName('debugGrid')
    if (oldGrid) this.app.stage.removeChild(oldGrid)
    
    const grid = new PIXI.Graphics()
    grid.name = 'debugGrid'
    grid.zIndex = 1000 // Высокий zIndex для сетки
    
    const step = 50
    const color = 0xFFFFFF
    const alpha = 0.2
    
    // Вертикальные линии
    for (let x = 0; x < this.app.screen.width; x += step) {
      grid.lineStyle(1, color, alpha)
      grid.moveTo(x, 0)
      grid.lineTo(x, this.app.screen.height)
    }
    
    // Горизонтальные линии
    for (let y = 0; y < this.app.screen.height; y += step) {
      grid.lineStyle(1, color, alpha)
      grid.moveTo(0, y)
      grid.lineTo(this.app.screen.width, y)
    }
    
    // Добавляем напрямую в stage
    this.app.stage.addChild(grid)
    // Сортируем после добавления
    this.app.stage.sortChildren()
    
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
    
    // Скрываем startScreen
    this.startScreen.container.visible = false
    
    // Рисуем debug сетку
    this.drawDebugGrid()
    
    // Загрузка завершена - показываем базу
    this.showBase()
  }

  async showBase() {
    log('[Game] showBase() called, completedPortals:', [...this.completedPortals])
    Z.reset() // Сбрасываем счётчики zIndex
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
      baseScreen = new BaseScreen(this.app, card_types)
      baseScreen.on('start_game', (portalId) => {
        // Проверка колоды перед входом в портал
        const activeDeckId = deckManager.getActiveDeckId()
        const validation = deckManager.validateDeck(activeDeckId, card_types)
        if (!validation.valid) {
          // Показываем модалку с предупреждением
          this.showDeckRequiredModal(validation.reason)
          return
        }
        
        // Показываем диалог подтверждения (все порталы стоят 3 кристала)
        this.showPortalConfirmDialog(portalId)
      })
      this.screens['base'] = baseScreen
    } else {
      log('[Game] Reusing existing BaseScreen')
    }
    
    // Передаём список пройденных порталов
    log('[Game] Calling baseScreen.init with:', [...this.completedPortals])
    await baseScreen.init(this.completedPortals || [])
    
    // Обновляем информацию о колоде после init (чтобы перезаписать данные из render)
    baseScreen.updateDeckInfo()
    
    // Проверяем ежедневную награду
    this.showDailyRewardIfAvailable()
    
    this.currentScreen = baseScreen
    
    // Рисуем сетку ПОСЛЕ BaseScreen
    this.drawDebugGrid()
  }

  showMap(portalId) {
    this.isBattleActive = false
    Z.reset()
    this.hideCurrentScreen()
    soundManager.playMusic('mapBg')
    
    // Инициализируем врагов с рандомными HP (каждый раз новые)
    initEnemies()
    
    // Переиспользуем существующую карту или создаём новую со случайной картой
    let mapScreen = this.screens['map']
    if (!mapScreen) {
      const randomMap = maps[Math.floor(Math.random() * maps.length)]
      // Ограничиваем количество врагов для тестирования
      const enemies = allEnemies.slice(0, config.enemiesCount || allEnemies.length)
      mapScreen = new MapScreen(this.app, randomMap, enemies, this)
      mapScreen.on('enemy_click', (enemyData) => this.initBattle(enemyData))
      mapScreen.on('exit_to_base', () => {
        // При выходе добавляем портал в пройденные
        const portalId = mapScreen.portalId
        if (portalId) {
          // Проверяем тип портала - премиум не добавляем в completed (циклический)
          const portalData = portalManager.getPortal(portalId)
          const isPremium = portalData?.type === 'premium'
          
          if (!isPremium && !this.completedPortals.includes(portalId)) {
            this.completedPortals.push(portalId)
          }
          
          // Обновляем статус портала в manager (скрыть его)
          portalManager.markPortalCompleted(portalId)
        }
        this.showBase()
      })
      this.screens['map'] = mapScreen
    }
    
    // Сохраняем portalId — не перезаписываем если уже установлен
    if (portalId !== undefined) {
      mapScreen.portalId = portalId
    }
    this.currentScreen = mapScreen
    mapScreen.show()
    this.drawDebugGrid()
  }

  initBattle(enemyData) {
    this.isBattleActive = true
    Z.reset()
    this.hideCurrentScreen()
    soundManager.play('battleStart')
    soundManager.stopMusic()
    soundManager.playMusic('battleBg')
    
    // Получаем колоду по коду игрока (из DeckManager)
    const playerDeck = deckManager.getDeck(deckManager.getActiveDeckId())
    const sleeve = collectionManager.getSleeve(playerDeck.sleeveId || 1)
    
    // Преобразуем массив ID карт в объекты карт с данными из card_types
    const cardObjects = playerDeck.cards.map(cardId => {
      const cardType = card_types.find(ct => ct.type === cardId)
      return cardType ? { ...cardType } : { type: cardId, name: `Тип ${cardId}`, value: 0 }
    })
    
    const battle = new Battle(this.app, cardObjects, card_types, enemyData, this, sleeve)

    // Показываем диалог врага перед боем
    this.showEnemyDialog(enemyData)
    
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
          
          if (portalId) {
            // Проверяем тип портала - премиум не добавляем в completed (циклический)
            const portalData = portalManager.getPortal(portalId)
            const isPremium = portalData?.type === 'premium'
            
            if (!isPremium && !this.completedPortals.includes(portalId)) {
              this.completedPortals.push(portalId)
            }
            
            // Отмечаем портал как пройденный в PortalManager
            portalManager.markPortalCompleted(portalId)
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
    
    battle.on('victory', () => {
      // Награда уже начислена и показана в модалке победы (battleStats.calculateReward())
      player.addWin()
      // Не показываем дополнительное сообщение - награды уже видны в модалке
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
    this.drawDebugGrid()
    
    // Добавляем кнопку выхода после загрузки ассетов
    battle.on('ready', () => {
      log('Battle ready, adding exit button')
      this.addExitButton(battle)
    })
  }

  addExitButton(battle) {
    // Кнопка "Сбежать"
    const exitBtn = new Button(t('game.run_away'), {
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
    
    exitBtn.setX(this.app.screen.width - 140)
    exitBtn.setY(50)
    
    battle.container.addChild(exitBtn)
  }

  hideCurrentScreen() {
    // Закрываем диалог перед переходом
    if (this.dialog) {
      this.dialog.hide()
    }
    if (this.currentScreen) {
      this.currentScreen.hide()
    }
  }

  // Показать диалог с героем
  // heroImage: PIXI.Texture - текстура картинки героя
  // text: string - полный текст диалога
  // onClose: function - коллбэк при закрытии
  showDialog(heroImage, text, onClose = null) {
    this.dialog.show(heroImage, text, onClose)
  }

  // Показать диалог врага перед боем
  async showEnemyDialog(enemyData) {
    if (!enemyData || !enemyData.dialog) return
    
    try {
      const texture = await PIXI.Assets.load(enemyData.image)
      this.showDialog(texture, enemyData.dialog)
    } catch (e) {
      console.warn('[Game] showEnemyDialog: failed to load texture', e)
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
    if (config.debug) {
      this.drawDebugGrid()
    }
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

  // Показать модалку о необходимости колоды
  showDeckRequiredModal(reason) {
    const modal = new Modal(this.app, {
      title: `⚠️ ${t('validation.deck_not_ready')}`,
      width: 400,
      height: 180,
      bgColor: colors.ui.panel.bg,
      showCloseButton: true
    })
    
    modal.setContent((content) => {
      const text = new PIXI.Text(
        t('validation.cannot_enter_portal', { reason }),
        {
          fontFamily: FONT,
          fontSize: 14,
          fill: colors.ui.text.primary,
          align: 'center',
          wordWrap: true,
          wordWrapWidth: 350
        }
      )
      text.anchor.set(0.5)
      text.y = -20
      content.addChild(text)
    })
    
    modal.addToStage(this.app.stage)
    modal.show()
  }

  // Показать диалог ежедневной награды
  async showDailyRewardIfAvailable() {
    const result = player.claimDailyReward(gameConfig)
    
    if (!result.received) {
      // Если награда уже получена сегодня - не показываем
      return
    }
    
    // Рандомная фраза
    const phrases = t('dailyReward.phrases') || []
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)]
    
    const npcName = t('dailyReward.npc') || 'Копейщица'
    const rewardText = t('dailyReward.reward', {
      gold: result.reward.gold,
      crystals: result.reward.crystals
    })
    
    const fullText = `${randomPhrase}\n\n${rewardText}`
    
    // Загружаем картинку помощника
    const heroTexture = await PIXI.Assets.load('/assets/img/cards/helper.png')
    
    // Показываем диалог
    this.dialog.show(heroTexture, fullText)
    
    // Сразу обновляем UI (не ждём закрытия)
    playerUI.update()
  }

  // Показать диалог подтверждения входа в портал
  showPortalConfirmDialog(portalId) {
    const cost = portalManager.getPremiumPortalCost(portalId)
    const have = player.crystals
    
    if (have < cost) {
      // Недостаточно кристаллов - показываем модалку с предупреждением
      const modal = new Modal(this.app, {
        title: t('portal.title'),
        width: 400,
        height: 160,
        bgColor: colors.ui.panel.bg,
        showCloseButton: true
      })
      
      modal.setContent((content) => {
        const text = new PIXI.Text(
          t('portal.notEnough', { cost, have }),
          { fontFamily: FONT, fontSize: 16, fill: colors.ui.text.defeat, wordWrap: true, wordWrapWidth: 350 }
        )
        text.anchor.set(0.5)
        text.y = -20
        content.addChild(text)
      })
      
      modal.addToStage(this.app.stage)
      modal.show()
      return
    }
    
    // Показываем модалку подтверждения
    const modal = new Modal(this.app, {
      title: t('portal.title'),
      width: 400,
      height: 200,
      bgColor: colors.ui.panel.bg,
      showCloseButton: false
    })
    
    modal.setContent((content) => {
      const text = new PIXI.Text(
        t('portal.confirm', { cost, have }),
        { fontFamily: FONT, fontSize: 16, fill: colors.ui.text.primary, wordWrap: true, wordWrapWidth: 350 }
      )
      text.anchor.set(0.5)
      text.y = -30
      content.addChild(text)
    })
    
    // Кнопка отмены
    const cancelBtn = new Button(t('portal.cancel'), {
      width: 140,
      height: 50,
      color: colors.ui.button.reset,
      app: this.app,
      fontSize: 16
    })
    cancelBtn.setX(-80)
    cancelBtn.setY(30)
    cancelBtn.onClick = () => {
      modal.hide()
      this.app.stage.removeChild(modal.container)
    }
    modal.addChild(cancelBtn)
    
    // Кнопка активации
    const activateBtn = new Button(t('portal.enter'), {
      width: 140,
      height: 50,
      color: colors.ui.button.play,
      app: this.app,
      fontSize: 16
    })
    activateBtn.setX(80)
    activateBtn.setY(30)
    activateBtn.onClick = () => {
      modal.hide()
      this.app.stage.removeChild(modal.container)
      // Списываем кристаллы
      playerUI.spendCrystals(cost)
      // Входим в портал
      this.showMap(portalId)
    }
    modal.addChild(activateBtn)
    
    modal.addToStage(this.app.stage)
    modal.show()
  }

  // Глобальный тикер для обновления порталов (работает всегда, даже на карте/в бою)
  updatePortals() {
    if (!portalManager || !portalManager.portalsData) {
      return
    }
    const randomPortals = portalManager.getRandomPortals()
    randomPortals.forEach(portal => {
      const completed = portalManager.checkPortalGrowthComplete(portal.id)
      if (completed) {
        console.log('[Game] Portal', portal.id, 'growth completed')
      }
    })
  }

  destroy() {
    // Останавливаем глобальный тикер порталов
    if (this._portalTicker) {
      this.app.ticker.remove(this._portalTicker)
      this._portalTicker = null
    }
  }
}
