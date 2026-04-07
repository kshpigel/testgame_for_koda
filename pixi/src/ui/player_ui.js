import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { player } from '../data/player.js'
import { deckManager } from '../data/deck_manager.js'
import { t } from '../data/i18n.js'

export class PlayerUI {
  constructor() {
    this.container = new PIXI.Container()
    this.goldText = null
    this.crystalsText = null
    this.deckText = null
    this.cardsText = null
    this.app = null
    
    // Слушаем изменения в localStorage (для синхронизации между вкладками)
    window.addEventListener('storage', (e) => {
      if (e.key === 'card_game_player') {
        this.update()
      }
    })
  }
  
  // Создать UI (вызывается из base_screen)
  create(app) {
    this.app = app
    this._createUI()
    return this.container
  }
  
  // Обновить все значения (вызывается при любом изменении)
  update() {
    this._updateTexts()
  }
  
  // Создать UI один раз
  _createUI() {
    this.container.removeChildren()
    
    const padding = 10
    const fontSize = 14
    const gap = 30
    
    // Фон
    this.bg = new PIXI.Graphics()
    this.bg.beginFill(0x000000, 0.25)
    this.bg.drawRoundedRect(0, 0, 400, 40, 8)
    this.bg.endFill()
    this.bg.x = 10
    this.bg.y = 10
    this.container.addChild(this.bg)
    
    // Имя игрока
    this.nameText = new PIXI.Text(player.name, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: colors.ui.text.primary
    })
    this.nameText.x = padding
    this.nameText.y = 20
    
    // Золото
    this.goldText = new PIXI.Text(`💰 ${player.gold}`, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: colors.ui.text.gold
    })
    this.goldText.x = this.nameText.x + this.nameText.width + gap
    this.goldText.y = 20
    
    // Кристаллы
    this.crystalsText = new PIXI.Text(`💎 ${player.crystals}`, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: colors.ui.text.crystals
    })
    this.crystalsText.x = this.goldText.x + this.goldText.width + gap
    this.crystalsText.y = 20
    
    // Колода
    const activeDeck = deckManager.getActiveDeck()
    let deckName = t('base.deck_not_selected')
    let deckCards = 0
    let isValid = false
    
    if (activeDeck) {
      deckName = activeDeck.name || 'Без названия'
      deckCards = activeDeck.cards?.length || 0
      isValid = deckCards >= 8
    }
    
    this.deckText = new PIXI.Text(deckName, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: isValid ? colors.ui.text.primary : 0xff6644
    })
    this.deckText.x = this.crystalsText.x + this.crystalsText.width + gap
    this.deckText.y = 20
    
    this.cardsText = new PIXI.Text(isValid ? t('base.deck_ready', { count: deckCards }) : t('base.deck_not_ready', { count: deckCards }), {
      fontFamily: FONT,
      fontSize: 12,
      fill: isValid ? colors.ui.text.secondary : 0xff6644
    })
    this.cardsText.x = this.deckText.x + this.deckText.width + 10
    this.cardsText.y = 22
    
    this.container.addChild(this.nameText, this.goldText, this.crystalsText, this.deckText, this.cardsText)
  }
  
  // Обновить только тексты (не пересоздавая container)
  _updateTexts() {
    if (!this.goldText) {
      // Если UI ещё не создан - создаём
      this._createUI()
      return
    }
    
    // Обновляем тексты
    this.goldText.text = `💰 ${player.gold}`
    this.crystalsText.text = `💎 ${player.crystals}`
    
    // Обновляем инфу о колоде
    const activeDeck = deckManager.getActiveDeck()
    let deckName = t('base.deck_not_selected')
    let deckCards = 0
    let isValid = false
    
    if (activeDeck) {
      deckName = activeDeck.name || 'Без названия'
      deckCards = activeDeck.cards?.length || 0
      isValid = deckCards >= 8
    }
    
    this.deckText.text = deckName
    this.deckText.style.fill = isValid ? colors.ui.text.primary : 0xff6644
    
    this.cardsText.text = isValid ? t('base.deck_ready', { count: deckCards }) : t('base.deck_not_ready', { count: deckCards })
    this.cardsText.style.fill = isValid ? colors.ui.text.secondary : 0xff6644
    
    // Пересчитываем позиции
    const padding = 10
    const fontSize = 14
    const gap = 30
    
    this.goldText.x = this.nameText.x + this.nameText.width + gap
    this.crystalsText.x = this.goldText.x + this.goldText.width + gap
    this.deckText.x = this.crystalsText.x + this.crystalsText.width + gap
    this.cardsText.x = this.deckText.x + this.deckText.width + 10
  }
  
  // Добавить золото (сохраняет в player и обновляет UI)
  addGold(amount) {
    player.addGold(amount)
    this.render()
  }
  
  // Добавить кристаллы (сохраняет в player и обновляет UI)
  addCrystals(amount) {
    player.addCrystals(amount)
    this.render()
  }
  
  // Списать золото (возвращает true если хватило)
  spendGold(amount) {
    if (player.gold < amount) return false
    player.addGold(-amount)
    this.render()
    return true
  }
  
  // Списать кристаллы (возвращает true если хватило)
  spendCrystals(amount) {
    if (player.crystals < amount) return false
    player.addCrystals(-amount)
    this.render()
    return true
  }
  
  render() {
    // Очищаем контейнер
    this.container.removeChildren()
    
    const padding = 10
    const fontSize = 14
    const gap = 30
    
    // Фон
    const bg = new PIXI.Graphics()
    bg.beginFill(0x000000, 0.25)
    bg.drawRoundedRect(0, 0, 400, 40, 8)
    bg.endFill()
    bg.x = 10
    bg.y = 10
    this.container.addChild(bg)
    
    // Имя игрока
    const nameText = new PIXI.Text(player.name, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: colors.ui.text.primary
    })
    nameText.x = padding
    nameText.y = 20
    
    // Золото
    this.goldText = new PIXI.Text(`💰 ${player.gold}`, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: colors.ui.text.gold
    })
    this.goldText.x = nameText.x + nameText.width + gap
    this.goldText.y = 20
    
    // Кристаллы
    this.crystalsText = new PIXI.Text(`💎 ${player.crystals}`, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: colors.ui.text.crystals
    })
    this.crystalsText.x = this.goldText.x + this.goldText.width + gap
    this.crystalsText.y = 20
    
    // Колода
    const activeDeck = deckManager.getActiveDeck()
    let deckName = t('base.deck_not_selected')
    let deckCards = 0
    let isValid = false
    
    if (activeDeck) {
      deckName = activeDeck.name || 'Без названия'
      deckCards = activeDeck.cards?.length || 0
      // Валидация без cardTypes - просто проверим минимальное количество
      isValid = deckCards >= 8 // Минимум 8 карт
    }
    
    this.deckText = new PIXI.Text(deckName, {
      fontFamily: FONT,
      fontSize: fontSize,
      fill: isValid ? colors.ui.text.primary : 0xff6644
    })
    this.deckText.x = this.crystalsText.x + this.crystalsText.width + gap
    this.deckText.y = 20
    
    // Количество карт
    this.cardsText = new PIXI.Text(isValid ? t('base.deck_ready', { count: deckCards }) : t('base.deck_not_ready', { count: deckCards }), {
      fontFamily: FONT,
      fontSize: 12,
      fill: isValid ? colors.ui.text.secondary : 0xff6644
    })
    this.cardsText.x = this.deckText.x + this.deckText.width + 10
    this.cardsText.y = 22
    
    this.container.addChild(nameText, this.goldText, this.crystalsText, this.deckText, this.cardsText)
  }
  
  // Уничтожить
  destroy() {
    this.container.destroy()
  }
}

// Глобальный экземпляр
export const playerUI = new PlayerUI()
