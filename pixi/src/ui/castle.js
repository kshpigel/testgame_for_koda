import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { soundManager } from '../audio/sound_manager.js'
import { UINode } from './ui_node.js'
import { Modal } from './modal.js'
import { collectionManager } from '../data/collection_manager.js'
import { deckManager } from '../data/deck_manager.js'
import { CardGridRenderer } from './card_grid_renderer.js'
import { DeckEditor } from './deck_editor.js'

export class Castle extends UINode {
  constructor(options = {}) {
    super({
      width: options.width || 220,
      height: options.height || 220,
      app: options.app || null,
      scaleSpeed: 0.15
    })

    this.app = options.app || null
    this.texture = options.texture || null
    this.onClick = options.onClick || null
    this.cardTypes = options.cardTypes || []
    this.assets = options.assets || {}
    this.gridRenderer = null
    this._tickerCallback = null
    
    this.glowFilter = new ColorMatrixFilter()
    this.glowFilter.brightness(1.3, false)
    this.targetBrightness = 1

    this.create()
    this.setupInteraction()
    
    // Debug рамка
    this.updateDebug()
  }

  create() {
    if (this.texture) {
      const castle = new PIXI.Sprite(this.texture)
      castle.anchor.set(0.5, 1) // Низ по центру - как в base_screen
      const scale = Math.min(
        this.width / castle.texture.width,
        this.height / castle.texture.height
      )
      castle.scale.set(scale)
      castle.name = 'castleSprite'
      this.addChild(castle)
    } else {
      // Заглушка
      const castle = new PIXI.Graphics()
      castle.beginFill(0x4444ff, 0.7)
      castle.drawRect(-50, -this.height, 100, this.height)
      castle.endFill()
      castle.name = 'castleSprite'
      this.addChild(castle)

      const label = new PIXI.Text('ЗАМОК', {
        fontFamily: FONT,
        fontSize: 16,
        fontWeight: 'bold',
        fill: '#ffffff'
      })
      label.anchor.set(0.5)
      label.y = -this.height - 20
      this.addChild(label)
    }
  }

  setupInteraction() {
    this.eventMode = 'static'
    this.cursor = 'pointer'

    this.on('pointerover', () => {
      this.setScale(1.05)
      this.targetBrightness = 1.5
      soundManager.play('hover')
    })

    this.on('pointerout', () => {
      this.setScale(1)
      this.targetBrightness = 1
    })

    this.on('pointerdown', () => {
      soundManager.play('click')
      this.showMainModal()
    })
  }

  // Показать главное модальное окно с выбором (Хранилище / Колода)
  showMainModal() {
    const modal = new Modal(this.app, {
      title: 'Замок',
      width: 500,
      height: 350,
      bgColor: colors.ui.panel.bg
    })

    // Контейнер с двумя кнопками
    const buttonsContainer = new PIXI.Container()
    
    // Кнопка "Хранилище"
    const storageBtn = this.createOptionButton(
      '📦 Хранилище',
      'Карты в коллекции',
      () => {
        // Не hide(), а просто открываем следующее поверх
        this.showStorageModal()
      }
    )
    storageBtn.x = -120
    buttonsContainer.addChild(storageBtn)
    
    // Кнопка "Колоды"
    const decksBtn = this.createOptionButton(
      '🃏 Колода',
      'Сборка колоды',
      () => {
        // Открываем редактор колоды
        this.openDeckEditor()
      }
    )
    decksBtn.x = 120
    buttonsContainer.addChild(decksBtn)
    
    buttonsContainer.y = 20
    modal.setContent((content) => {
      content.addChild(buttonsContainer)
    })

    modal.addToStage(this.app.stage)
    modal.show()
  }

  // Создать кнопку-опцию (с иконкой и подписью)
  createOptionButton(title, subtitle, onClick) {
    const container = new PIXI.Container()
    
    // Фон кнопки
    const bg = new PIXI.Graphics()
    bg.beginFill(colors.ui.button.primary)
    bg.drawRoundedRect(-80, -50, 160, 100, 10)
    bg.endFill()
    bg.lineStyle(2, colors.ui.text.primary)
    bg.hitArea = new PIXI.Rectangle(-80, -50, 160, 100)
    container.addChild(bg)
    
    // HitArea для контейнера
    container.hitArea = new PIXI.Rectangle(-80, -50, 160, 100)
    
    // Заголовок
    const titleText = new PIXI.Text(title, {
      fontFamily: FONT,
      fontSize: 18,
      fontWeight: 'bold',
      fill: colors.ui.text.primary
    })
    titleText.anchor.set(0.5)
    titleText.y = -15
    container.addChild(titleText)
    
    // Подзаголовок
    const subtitleText = new PIXI.Text(subtitle, {
      fontFamily: FONT,
      fontSize: 12,
      fill: colors.ui.text.secondary
    })
    subtitleText.anchor.set(0.5)
    subtitleText.y = 20
    container.addChild(subtitleText)
    
    // Интерактивность
    container.eventMode = 'static'
    container.cursor = 'pointer'
    container.on('pointerover', () => {
      bg.clear()
      bg.beginFill(colors.ui.button.hover)
      bg.drawRoundedRect(-80, -50, 160, 100, 10)
      bg.endFill()
      bg.lineStyle(2, colors.ui.text.primary)
      soundManager.play('hover')
    })
    container.on('pointerout', () => {
      bg.clear()
      bg.beginFill(colors.ui.button.primary)
      bg.drawRoundedRect(-80, -50, 160, 100, 10)
      bg.endFill()
      bg.lineStyle(2, colors.ui.text.primary)
    })
    container.on('pointerdown', () => {
      soundManager.play('click')
      if (onClick) onClick()
    })
    
    return container
  }

  // Модальное окно хранилища
  showStorageModal() {
    const modal = new Modal(this.app, {
      title: 'Хранилище карт',
      width: 750,
      height: 500,
      bgColor: colors.ui.panel.bg
    })

    // Статистика
    const total = collectionManager.getTotal()
    const max = collectionManager.getMax()
    const statsText = new PIXI.Text(
      `Всего карт: ${total} / ${max}`,
      {
        fontFamily: FONT,
        fontSize: 16,
        fill: colors.ui.text.primary
      }
    )
    statsText.anchor.set(0.5, 0)
    statsText.y = -200 // Смещаем выше
    
    modal.setContent((content) => {
      content.addChild(statsText)
      
      // Рендерим карты в content
      const cards = collectionManager.getAllCards()
      const cardDataList = Object.entries(cards).map(([type, count]) => {
        const cardType = this.cardTypes.find(c => c.type === parseInt(type))
        return {
          type: parseInt(type),
          count,
          ...cardType
        }
      })
      
      this.gridRenderer = new CardGridRenderer(this.app, cardDataList, this.assets, {
        columns: 6,
        cardScale: 0.55,
        gap: 8,
        showCount: true,
        grayscaleZero: false,
        sortBy: 'type',
        sortDesc: false,
        cardTypes: this.cardTypes
      })
      this.gridRenderer.render(content)
    })
    
    // Запускаем ticker для скролла
    this.startTicker()

    modal.onClose = () => {
      this.stopTicker()
      if (this.gridRenderer) {
        this.gridRenderer.destroy()
        this.gridRenderer = null
      }
    }

    modal.addToStage(this.app.stage)
    modal.show()
  }

  // Открыть редактор колоды
  openDeckEditor() {
    const editor = new DeckEditor(this.app, this.cardTypes, this.assets)
    editor.show()
  }
  
  // Запустить ticker для обновления скролла
  startTicker() {
    if (this._tickerCallback) return
    
    this._tickerCallback = () => {
      if (this.gridRenderer) {
        this.gridRenderer.update()
      }
    }
    this.app.ticker.add(this._tickerCallback)
  }
  
  // Остановить ticker
  stopTicker() {
    if (this._tickerCallback) {
      this.app.ticker.remove(this._tickerCallback)
      this._tickerCallback = null
    }
    this.gridRenderer = null
  }

  // Анимация glow (отдельная от scale)
  updateGlow() {
    const castleSprite = this.getChildByName('castleSprite')
    if (castleSprite) {
      // Brightness анимация
      const brightnessDiff = this.targetBrightness - (this.glowFilter.brightness || 1)
      if (Math.abs(brightnessDiff) > 0.01) {
        const newBrightness = (this.glowFilter.brightness || 1) + brightnessDiff * 0.1
        this.glowFilter.brightness(newBrightness, false)
        
        if (this.targetBrightness > 1 || Math.abs(newBrightness - 1) > 0.01) {
          castleSprite.filters = [this.glowFilter]
        } else {
          castleSprite.filters = null
        }
      }
    }
  }

  // Публичный метод для вызова из BaseScreen (alias для updateScale + glow)
  update() {
    this.updateScale()
    this.updateGlow()
  }
}
