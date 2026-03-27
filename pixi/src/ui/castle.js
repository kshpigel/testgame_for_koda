import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { soundManager } from '../audio/sound_manager.js'
import { UINode } from './ui_node.js'
import { Modal } from './modal.js'
import { collectionManager } from '../data/collection_manager.js'
import { deckManager } from '../data/deck_manager.js'

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
        modal.hide()
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
        modal.hide()
        this.showDecksModal()
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
    container.addChild(bg)
    
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
      width: 600,
      height: 500,
      bgColor: colors.ui.panel.bg
    })

    const content = new PIXI.Container()
    
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
    statsText.y = -180
    content.addChild(statsText)
    
    // Список карт (скролл или простой список)
    const cards = collectionManager.getAllCards()
    const cardTypes = Object.keys(cards).map(Number).sort((a, b) => a - b)
    
    const listContainer = new PIXI.Container()
    listContainer.y = -120
    
    cardTypes.forEach((type, index) => {
      const count = cards[type]
      const row = new PIXI.Container()
      row.y = index * 30
      
      const typeText = new PIXI.Text(`Type ${type}:`, {
        fontFamily: FONT,
        fontSize: 14,
        fill: colors.ui.text.primary
      })
      typeText.anchor.set(0, 0.5)
      typeText.x = -250
      row.addChild(typeText)
      
      const countText = new PIXI.Text(`×${count}`, {
        fontFamily: FONT,
        fontSize: 14,
        fill: colors.ui.text.gold
      })
      countText.anchor.set(0, 0.5)
      countText.x = -100
      row.addChild(countText)
      
      listContainer.addChild(row)
    })
    
    // Ограничиваем высоту
    if (cardTypes.length > 10) {
      listContainer.scale.y = 10 / cardTypes.length
    }
    
    content.addChild(listContainer)
    
    modal.setContent((c) => {
      c.addChild(content)
    })

    modal.addToStage(this.app.stage)
    modal.show()
  }

  // Модальное окно колод
  showDecksModal() {
    const modal = new Modal(this.app, {
      title: 'Управление колодой',
      width: 600,
      height: 500,
      bgColor: colors.ui.panel.bg
    })

    const content = new PIXI.Container()
    
    // Информация об активной колоде
    const activeDeck = deckManager.getActiveDeck()
    const deckSize = activeDeck ? activeDeck.cards.length : 0
    
    const infoText = new PIXI.Text(
      `Колода: ${activeDeck?.name || 'Нет'} (${deckSize} карт)`,
      {
        fontFamily: FONT,
        fontSize: 16,
        fill: colors.ui.text.primary
      }
    )
    infoText.anchor.set(0.5, 0)
    infoText.y = -180
    content.addChild(infoText)
    
    // Валидация
    const validation = deckManager.validateDeck(deckManager.getActiveDeckId())
    const validationText = new PIXI.Text(
      validation.valid ? '✅ Колода готова к бою' : `⚠️ ${validation.reason}`,
      {
        fontFamily: FONT,
        fontSize: 14,
        fill: validation.valid ? colors.ui.text.primary : 0xff6644
      }
    )
    validationText.anchor.set(0.5, 0)
    validationText.y = -150
    content.addChild(validationText)
    
    // Список карт в колоде
    const cardCounts = {}
    if (activeDeck) {
      activeDeck.cards.forEach(type => {
        cardCounts[type] = (cardCounts[type] || 0) + 1
      })
    }
    
    const listContainer = new PIXI.Container()
    listContainer.y = -100
    
    const cardTypes = Object.keys(cardCounts).map(Number).sort((a, b) => a - b)
    cardTypes.forEach((type, index) => {
      const count = cardCounts[type]
      const haveInCollection = collectionManager.getCount(type)
      
      const row = new PIXI.Container()
      row.y = index * 25
      
      const typeText = new PIXI.Text(`Type ${type}:`, {
        fontFamily: FONT,
        fontSize: 12,
        fill: colors.ui.text.primary
      })
      typeText.anchor.set(0, 0.5)
      typeText.x = -250
      row.addChild(typeText)
      
      const countText = new PIXI.Text(
        `×${count} (есть ${haveInCollection})`,
        {
          fontFamily: FONT,
          fontSize: 12,
          fill: count <= haveInCollection ? colors.ui.text.gold : 0xff6644
        }
      )
      countText.anchor.set(0, 0.5)
      countText.x = -100
      row.addChild(countText)
      
      listContainer.addChild(row)
    })
    
    // Ограничиваем высоту
    if (cardTypes.length > 12) {
      listContainer.scale.y = 12 / cardTypes.length
    }
    
    content.addChild(listContainer)
    
    modal.setContent((c) => {
      c.addChild(content)
    })

    modal.addToStage(this.app.stage)
    modal.show()
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
