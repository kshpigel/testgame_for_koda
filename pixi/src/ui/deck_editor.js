import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { soundManager } from '../audio/sound_manager.js'
import { Modal } from './modal.js'
import { Button } from './button.js'
import { collectionManager } from '../data/collection_manager.js'
import { deckManager } from '../data/deck_manager.js'
import { Card } from './card.js'
import { CARD_CONFIG } from './card.js'
import { getCardStyle } from '../data/card_styles.js'

const DECK_EDITOR_CONFIG = {
  modalWidth: 900,
  modalHeight: 600,
  cardScale: 0.55,
  columns: 6,
  gap: 30
}

export class DeckEditor {
  constructor(app, cardTypes, assets) {
    this.app = app
    this.cardTypes = cardTypes
    this.assets = assets
    this.modal = null
    this.currentDeckId = deckManager.getActiveDeckId()
    this.currentDeck = null
    this.savedDeckState = null
    this.cardSprites = []
    this.statusText = null
    this._tickerCallback = null
    this.scrollY = 0
    this.targetScrollY = 0
    this.scrollContainer = null
    this.mask = null
    this.scrollbar = null
    this.scrollParams = null
    
    // Grayscale фильтр для карт с count = 0
    this.grayFilter = new ColorMatrixFilter()
    this.grayFilter.grayscale(0.5)
  }

  show() {
    this.savedDeckState = this._getDeckStateCopy()
    
    this.modal = new Modal(this.app, {
      title: 'Редактор колоды',
      width: DECK_EDITOR_CONFIG.modalWidth,
      height: DECK_EDITOR_CONFIG.modalHeight,
      bgColor: colors.ui.panel.bg,
      showCloseButton: true
    })

    this.currentDeck = deckManager.getDeck(this.currentDeckId)
    
    this.modal.setContent((content) => {
      this.renderHeader(content)
      this.renderDeckSelector(content)
      this.renderSleeveSection(content)
      this.renderCardsGrid(content)
      this.renderFooter(content)
    })

    this.modal.onClose = () => this.onClose()
    this.modal.addToStage(this.app.stage)
    this.modal.show()
    
    this.startTicker()
  }

  renderHeader(content) {
    const deck = this.currentDeck
    const deckName = deck?.name || 'Новая колода'
    
    const nameContainer = new PIXI.Container()
    nameContainer.y = -240
    
    this.deckNameText = new PIXI.Text(deckName, {
      fontFamily: FONT,
      fontSize: 22,
      fontWeight: 'bold',
      fill: colors.ui.text.primary
    })
    this.deckNameText.anchor.set(0.5)
    this.deckNameText.eventMode = 'static'
    this.deckNameText.cursor = 'pointer'
    this.deckNameText.on('pointerdown', () => this.startEditingName())
    nameContainer.addChild(this.deckNameText)
    
    const hintText = new PIXI.Text('(клик для редактирования)', {
      fontFamily: FONT,
      fontSize: 10,
      fill: colors.ui.text.secondary
    })
    hintText.anchor.set(0.5)
    hintText.y = 18
    nameContainer.addChild(hintText)
    
    content.addChild(nameContainer)
  }

  renderDeckSelector(content) {
    const selectorContainer = new PIXI.Container()
    selectorContainer.y = -240
    selectorContainer.x = 320
    
    const decks = deckManager.getAllDecks()
    const deckIds = Object.keys(decks)
    const activeDeckId = deckManager.getActiveDeckId()
    const isActive = String(this.currentDeckId) === String(activeDeckId)
    
    // Подсветка активной колоды
    if (isActive) {
      const activeBg = new PIXI.Graphics()
      activeBg.lineStyle(2, colors.ui.text.gold || 0xFFD700)
      activeBg.beginFill(colors.ui.panel.dark || 0x1a1a1a, 0.3)
      activeBg.drawRoundedRect(-70, -20, 230, 40, 8)
      activeBg.endFill()
      selectorContainer.addChild(activeBg)
    }
    
    const prevBtn = new Button('<', {
      width: 30,
      height: 30,
      color: colors.ui.button.primary,
      fontSize: 16,
      app: this.app
    })
    prevBtn.setX(-60)
    prevBtn.onClick = () => this.selectPrevDeck(deckIds)
    selectorContainer.addChild(prevBtn)
    
    const nextBtn = new Button('>', {
      width: 30,
      height: 30,
      color: colors.ui.button.primary,
      fontSize: 16,
      app: this.app
    })
    nextBtn.setX(60)
    nextBtn.onClick = () => this.selectNextDeck(deckIds)
    selectorContainer.addChild(nextBtn)
    
    const idx = deckIds.indexOf(String(this.currentDeckId))
    const counterText = new PIXI.Text(`${idx + 1}/${deckIds.length}`, {
      fontFamily: FONT,
      fontSize: 14,
      fill: isActive ? colors.ui.text.gold : colors.ui.text.secondary
    })
    counterText.anchor.set(0.5)
    counterText.y = -12
    selectorContainer.addChild(counterText)
    
    // Статус активности
    const statusText = new PIXI.Text(isActive ? '✓ Активна' : '', {
      fontFamily: FONT,
      fontSize: 10,
      fill: colors.ui.text.gold
    })
    statusText.anchor.set(0.5)
    statusText.y = 8
    selectorContainer.addChild(statusText)
    
    const newBtn = new Button('+', {
      width: 30,
      height: 30,
      color: colors.ui.button.play,
      fontSize: 18,
      app: this.app
    })
    newBtn.setX(110)
    newBtn.onClick = () => this.createNewDeck()
    selectorContainer.addChild(newBtn)
    
    // Кнопка "Выбрать" если не активна
    if (!isActive) {
      const selectBtn = new Button('Выбрать', {
        width: 80,
        height: 24,
        color: colors.ui.button.play,
        fontSize: 12,
        app: this.app
      })
      selectBtn.setX(155)
      selectBtn.onClick = () => this.selectDeck()
      selectorContainer.addChild(selectBtn)
    }
    
    content.addChild(selectorContainer)
  }

  renderSleeveSection(content) {
    const sleeveContainer = new PIXI.Container()
    sleeveContainer.y = -195
    sleeveContainer.x = -380
    
    const titleText = new PIXI.Text('Рубашка:', {
      fontFamily: FONT,
      fontSize: 16,
      fill: colors.ui.text.primary
    })
    titleText.anchor.set(0, 0.5)
    sleeveContainer.addChild(titleText)
    
    const sleeveId = this.currentDeck?.sleeveId || 1
    const sleeve = collectionManager.getSleeve(sleeveId)
    const minCards = collectionManager.getMinCards(sleeveId)
    
    this.sleeveInfoText = new PIXI.Text(
      `${sleeve?.name || 'Unknown'} (${sleeve?.turns || 0} ходов, ${sleeve?.discards || 0} сбросов)`,
      {
        fontFamily: FONT,
        fontSize: 14,
        fill: colors.ui.text.secondary
      }
    )
    this.sleeveInfoText.anchor.set(0, 0.5)
    this.sleeveInfoText.y = 22
    sleeveContainer.addChild(this.sleeveInfoText)
    
    const minCardsText = new PIXI.Text(`minCards: ${minCards}`, {
      fontFamily: FONT,
      fontSize: 12,
      fill: colors.ui.text.secondary
    })
    minCardsText.anchor.set(0, 0.5)
    minCardsText.y = 40
    sleeveContainer.addChild(minCardsText)
    
    const changeSleeveBtn = new Button('Изменить', {
      width: 100,
      height: 30,
      color: colors.ui.button.primary,
      fontSize: 14,
      app: this.app
    })
    changeSleeveBtn.setX(80)
    changeSleeveBtn.setY(10)
    changeSleeveBtn.onClick = () => this.showSleeveSelector()
    sleeveContainer.addChild(changeSleeveBtn)
    
    content.addChild(sleeveContainer)
  }

  renderCardsGrid(content) {
    const cardWidth = CARD_CONFIG.width * DECK_EDITOR_CONFIG.cardScale
    const cardHeight = CARD_CONFIG.height * DECK_EDITOR_CONFIG.cardScale
    const cols = DECK_EDITOR_CONFIG.columns
    const gap = DECK_EDITOR_CONFIG.gap
    
    const deckCards = this.currentDeck?.cards || []
    const deckCardCounts = {}
    deckCards.forEach(type => {
      deckCardCounts[type] = (deckCardCounts[type] || 0) + 1
    })
    
    const collectionCards = collectionManager.getAllCards()
    const cardTypes = Object.keys(collectionCards)
    
    const sortedTypes = cardTypes.sort((a, b) => {
      const cardA = this.cardTypes.find(c => c.type === parseInt(a))
      const cardB = this.cardTypes.find(c => c.type === parseInt(b))
      return (cardB?.value || 0) - (cardA?.value || 0)
    })
    
    const rows = Math.ceil(sortedTypes.length / cols)
    const totalWidth = cols * (cardWidth + gap) - gap + 50
    const totalHeight = rows * (cardHeight + gap) - gap + 50
    
    const startX = -totalWidth / 2 + cardWidth / 2 + 15
    const startY = 0
    
    const viewHeight = 320
    const viewWidth = 850
    
    this.scrollContainer = new PIXI.Container()
    this.scrollContainer.sortableChildren = true
    this.scrollContainer.x = 0
    this.scrollContainer.y = 0
    
    this.mask = new PIXI.Graphics()
    this.mask.beginFill(0xffffff)
    this.mask.drawRect(-viewWidth / 2 + 30, -viewHeight / 2 + 5, viewWidth - 60, viewHeight)
    this.mask.endFill()
    this.scrollContainer.mask = this.mask
    content.addChild(this.mask)
    content.addChild(this.scrollContainer)
    
    sortedTypes.forEach((typeStr, index) => {
      const type = parseInt(typeStr)
      const haveInCollection = collectionCards[typeStr] || 0
      const inDeck = deckCardCounts[type] || 0
      const cardType = this.cardTypes.find(c => c.type === type)
      const maxInDeck = cardType?.maxInDeck || 5 // лимит карты в колоде
      const availableInCollection = Math.min(maxInDeck, haveInCollection) // Y = мин. из maxInDeck и хранилища
      
      const col = index % cols
      const row = Math.floor(index / cols)
      
      const cardContainer = new PIXI.Container()
      cardContainer.sortableChildren = true
      cardContainer.zIndex = 1
      cardContainer.x = startX + col * (cardWidth + gap)
      cardContainer.y = startY + row * (cardHeight + gap)
      
      const cardStyle = cardType ? getCardStyle(cardType.style) : null
      const card = new Card(cardType || { type, name: `Type ${type}`, value: 0 }, {
        width: CARD_CONFIG.width,
        height: CARD_CONFIG.height,
        scale: DECK_EDITOR_CONFIG.cardScale,
        style: cardStyle
      })
      card.zIndex = 1
      cardContainer.zIndex = 1
      
      // Grayscale если карты нет в колоде (inDeck = 0)
      if (inDeck === 0) {
        card.filters = [this.grayFilter]
      }
      
      if (this.assets && cardType) {
        if (this.assets[`card_bg_${cardType.type}`]) {
          card.loadBgImage(this.assets[`card_bg_${cardType.type}`].texture)
        }
        if (this.assets[`card_${cardType.type}`]) {
          card.loadHeroImage(this.assets[`card_${cardType.type}`].texture)
        }
      }
      
      cardContainer.addChild(card)
      
      // Кнопки под картой - добавляем в scrollContainer отдельно (поверх карт)
      const controlsContainer = new PIXI.Container()
      controlsContainer.zIndex = 100
      // Абсолютные координаты в scrollContainer (смещены влево на cardWidth/2)
      controlsContainer.x = startX + col * (cardWidth + gap) - cardWidth / 2
      controlsContainer.y = startY + row * (cardHeight + gap) - 2
      
      const minusBtn = new Button('-', {
        width: 24,
        height: 24,
        color: inDeck > 0 ? colors.ui.button.reset : colors.ui.panel.dark,
        fontSize: 14,
        app: this.app
      })
      minusBtn.setX(-30)
      minusBtn.setY(0)
      minusBtn.onClick = () => this.removeCard(type)
      minusBtn.eventMode = inDeck > 0 ? 'static' : 'none'
      controlsContainer.addChild(minusBtn)
      
      const countText = new PIXI.Text(`${inDeck}/${availableInCollection}`, {
        fontFamily: FONT,
        fontSize: 12,
        fontWeight: 'bold',
        fill: inDeck > 0 ? colors.ui.text.primary : colors.ui.text.secondary
      })
      countText.anchor.set(0.5)
      countText.y = 0
      controlsContainer.addChild(countText)
      
      const plusBtn = new Button('+', {
        width: 24,
        height: 24,
        color: inDeck < availableInCollection ? colors.ui.button.play : colors.ui.panel.dark,
        fontSize: 14,
        app: this.app
      })
      plusBtn.setX(30)
      plusBtn.setY(0)
      plusBtn.onClick = () => this.addCard(type)
      plusBtn.eventMode = inDeck < availableInCollection ? 'static' : 'none'
      controlsContainer.addChild(plusBtn)
      
      
      
      this.scrollContainer.addChild(cardContainer)
      this.scrollContainer.addChild(controlsContainer)
      
      this.cardSprites.push({
        type,
        container: cardContainer,
        card,
        plusBtn,
        minusBtn,
        countText,
        availableInCollection
      })
    })
    
    const maxScroll = Math.max(0, totalHeight - viewHeight)
    if (maxScroll > 0) {
      this.createScrollbar(content, totalHeight, viewHeight)
      this.setupWheel(content)
    }
  }

  renderFooter(content) {
    const footerContainer = new PIXI.Container()
    footerContainer.y = 230
    
    this.statusText = this.createStatusText()
    this.statusText.anchor.set(0.5)
    footerContainer.addChild(this.statusText)
    
    const resetBtn = new Button('Сбросить', {
      width: 120,
      height: 40,
      color: colors.ui.button.reset,
      fontSize: 16,
      app: this.app
    })
    resetBtn.setX(-150)
    resetBtn.onClick = () => this.resetDeck()
    footerContainer.addChild(resetBtn)
    
    const saveBtn = new Button('Сохранить', {
      width: 150,
      height: 40,
      color: colors.ui.button.play,
      fontSize: 16,
      app: this.app
    })
    saveBtn.setX(150)
    saveBtn.onClick = () => this.saveDeck()
    footerContainer.addChild(saveBtn)
    
    content.addChild(footerContainer)
  }

  createStatusText() {
    const deckSize = this.currentDeck?.cards.length || 0
    const sleeveId = this.currentDeck?.sleeveId || 1
    const minCards = collectionManager.getMinCards(sleeveId)
    const isValid = deckSize >= minCards
    
    return new PIXI.Text(
      `Карт в колоде: ${deckSize} / ${minCards} ${isValid ? '✅' : '⚠️'}`,
      {
        fontFamily: FONT,
        fontSize: 16,
        fill: isValid ? colors.ui.text.primary : 0xff6644
      }
    )
  }

  selectPrevDeck(deckIds) {
    const idx = deckIds.indexOf(String(this.currentDeckId))
    const newIdx = idx > 0 ? idx - 1 : deckIds.length - 1
    this.switchDeck(parseInt(deckIds[newIdx]))
  }

  selectNextDeck(deckIds) {
    const idx = deckIds.indexOf(String(this.currentDeckId))
    const newIdx = idx < deckIds.length - 1 ? idx + 1 : 0
    this.switchDeck(parseInt(deckIds[newIdx]))
  }

  switchDeck(deckId) {
    this.currentDeckId = deckId
    this.currentDeck = deckManager.getDeck(deckId)
    this.savedDeckState = this._getDeckStateCopy()
    this.modal.hide()
    this.modal.removeFromStage(this.app.stage)
    this.show()
  }

  // Выбрать эту колоду как активную для боя
  selectDeck() {
    const validation = deckManager.validateDeck(this.currentDeckId, this.cardTypes)
    if (!validation.valid) {
      // Показываем предупреждение
      alert(`Нельзя выбрать эту колоду: ${validation.reason}`)
      return
    }
    deckManager.setActiveDeck(this.currentDeckId)
    soundManager.play('click')
    // Перерисовываем чтобы показать статус
    this.modal.hide()
    this.modal.removeFromStage(this.app.stage)
    this.show()
  }

  createNewDeck() {
    const newId = deckManager.createDeck('Новая колода', 1)
    deckManager.setActiveDeck(newId)
    this.switchDeck(newId)
  }

  startEditingName() {
    const inputContainer = new PIXI.Container()
    inputContainer.y = -250
    
    const bg = new PIXI.Graphics()
    bg.lineStyle(2, colors.ui.text.primary)
    bg.beginFill(colors.ui.panel.bg)
    bg.drawRoundedRect(-100, -15, 200, 30, 5)
    bg.endFill()
    inputContainer.addChild(bg)
    
    const inputText = new PIXI.Text(this.currentDeck?.name || '', {
      fontFamily: FONT,
      fontSize: 18,
      fill: colors.ui.text.primary
    })
    inputText.anchor.set(0.5)
    inputText.x = 0
    inputText.y = 0
    
    // Простой инпут - клик меняет текст
    inputText.eventMode = 'static'
    inputText.cursor = 'pointer'
    
    let newName = this.currentDeck?.name || ''
    inputText.on('pointerdown', () => {
      // Простойprompt
      const result = prompt('Введите название колоды:', newName)
      if (result) {
        newName = result
        inputText.text = result
      }
    })
    
    // Enter для подтверждения
    window.addEventListener('keydown', function onEnter(e) {
      if (e.key === 'Enter') {
        deckManager.updateDeckName(this.currentDeckId, newName)
        window.removeEventListener('keydown', onEnter)
      }
    })
    
    inputContainer.addChild(inputText)
    this.modal.content.addChild(inputContainer)
  }

  showSleeveSelector() {
    const sleeveModal = new Modal(this.app, {
      title: 'Выбор рубашки',
      width: 600,
      height: 400,
      bgColor: colors.ui.panel.bg
    })

    const sleeves = collectionManager.getAllSleeves()
    const sleeveIds = Object.keys(sleeves)
    const cols = 3
    const cardWidth = 150
    const cardHeight = 100
    
    sleeveModal.setContent((content) => {
      sleeveIds.forEach((id, index) => {
        const sleeve = sleeves[id]
        const col = index % cols
        const row = Math.floor(index / cols)
        
        const sleeveContainer = new PIXI.Container()
        sleeveContainer.x = -200 + col * (cardWidth + 20)
        sleeveContainer.y = -120 + row * (cardHeight + 20)
        
        const bg = new PIXI.Graphics()
        const isSelected = sleeve.id === this.currentDeck?.sleeveId
        bg.lineStyle(2, isSelected ? colors.ui.text.gold : colors.ui.text.primary)
        bg.beginFill(isSelected ? colors.ui.panel.dark : colors.ui.panel.bg)
        bg.drawRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 8)
        bg.endFill()
        sleeveContainer.addChild(bg)
        
        const nameText = new PIXI.Text(sleeve.name, {
          fontFamily: FONT,
          fontSize: 14,
          fontWeight: 'bold',
          fill: colors.ui.text.primary
        })
        nameText.anchor.set(0.5)
        nameText.y = -25
        sleeveContainer.addChild(nameText)
        
        const paramsText = new PIXI.Text(`${sleeve.turns} ходов\n${sleeve.discards} сбросов`, {
          fontFamily: FONT,
          fontSize: 12,
          fill: colors.ui.text.secondary,
          align: 'center'
        })
        paramsText.anchor.set(0.5)
        sleeveContainer.addChild(paramsText)
        
        const minCards = collectionManager.getMinCards(sleeve.id)
        const minText = new PIXI.Text(`min: ${minCards}`, {
          fontFamily: FONT,
          fontSize: 10,
          fill: colors.ui.text.secondary
        })
        minText.anchor.set(0.5)
        minText.y = 25
        sleeveContainer.addChild(minText)
        
        sleeveContainer.eventMode = 'static'
        sleeveContainer.cursor = 'pointer'
        sleeveContainer.on('pointerdown', () => {
          deckManager.setSleeveId(this.currentDeckId, sleeve.id)
          this.currentDeck = deckManager.getDeck(this.currentDeckId)
          sleeveModal.hide()
          this.modal.hide()
          this.modal.removeFromStage(this.app.stage)
          this.show()
        })
        
        content.addChild(sleeveContainer)
      })
    })

    sleeveModal.addToStage(this.app.stage)
    sleeveModal.show()
  }

  addCard(type) {
    deckManager.addCardToDeck(this.currentDeckId, type)
    this.currentDeck = deckManager.getDeck(this.currentDeckId)
    this.updateCardCounts()
    this.updateStatusText()
  }

  removeCard(type) {
    deckManager.removeCardFromDeck(this.currentDeckId, type)
    this.currentDeck = deckManager.getDeck(this.currentDeckId)
    this.updateCardCounts()
    this.updateStatusText()
  }

  updateCardCounts() {
    const deckCards = this.currentDeck?.cards || []
    const deckCardCounts = {}
    deckCards.forEach(t => {
      deckCardCounts[t] = (deckCardCounts[t] || 0) + 1
    })
    
    const collectionCards = collectionManager.getAllCards()
    
    this.cardSprites.forEach(item => {
      const inDeck = deckCardCounts[item.type] || 0
      const availableInCollection = item.availableInCollection || 5
      
      item.countText.text = `${inDeck}/${availableInCollection}`
      
      // Grayscale если нет в колоде
      item.card.filters = inDeck === 0 ? [this.grayFilter] : null
      
      item.minusBtn.eventMode = inDeck > 0 ? 'static' : 'none'
      item.minusBtn.setColor(inDeck > 0 ? colors.ui.button.reset : colors.ui.panel.dark)
      
      item.plusBtn.eventMode = inDeck < availableInCollection ? 'static' : 'none'
      item.plusBtn.setColor(inDeck < availableInCollection ? colors.ui.button.play : colors.ui.panel.dark)
    })
  }

  updateStatusText() {
    const footer = this.statusText?.parent
    if (footer) {
      footer.removeChild(this.statusText)
      this.statusText = this.createStatusText()
      this.statusText.anchor.set(0.5)
      footer.addChild(this.statusText)
    }
  }

  saveDeck() {
    deckManager.save()
    this.savedDeckState = this._getDeckStateCopy()
    soundManager.play('click')
  }

  resetDeck() {
    if (this.savedDeckState) {
      this.currentDeck.cards = [...this.savedDeckState.cards]
      if (this.savedDeckState.name) {
        this.currentDeck.name = this.savedDeckState.name
      }
      if (this.savedDeckState.sleeveId) {
        this.currentDeck.sleeveId = this.savedDeckState.sleeveId
      }
      deckManager.save()
      this.currentDeck = deckManager.getDeck(this.currentDeckId)
      
      this.modal.hide()
      this.modal.removeFromStage(this.app.stage)
      this.show()
    }
  }

  _getDeckStateCopy() {
    return {
      name: this.currentDeck?.name,
      sleeveId: this.currentDeck?.sleeveId,
      cards: [...(this.currentDeck?.cards || [])]
    }
  }

  createScrollbar(content, totalHeight, viewHeight) {
    const scrollbarWidth = 6
    const scrollbarHeight = Math.min(viewHeight, (viewHeight / totalHeight) * viewHeight)
    const trackHeight = viewHeight - 20
    
    const track = new PIXI.Graphics()
    track.beginFill(colors.ui.panel.dark || 0x222222)
    track.drawRoundedRect(0, 0, scrollbarWidth, trackHeight, 3)
    track.endFill()
    track.x = 380
    track.y = -viewHeight/2 + 5
    content.addChild(track)
    
    this.scrollbar = new PIXI.Graphics()
    this.scrollbar.beginFill(colors.ui.text.primary)
    this.scrollbar.drawRoundedRect(0, 0, scrollbarWidth, scrollbarHeight, 3)
    this.scrollbar.endFill()
    this.scrollbar.x = 380
    this.scrollbar.y = -viewHeight/2 + 5
    
    this.scrollParams = { trackHeight, scrollbarHeight, totalHeight, viewHeight }
    content.addChild(this.scrollbar)
  }

  setupWheel(content) {
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.on('wheel', this.onWheel, this)
    this._wheelContent = content
  }

  onWheel(e) {
    if (!this._wheelContent || !this._wheelContent.parent) return
    e.stopPropagation()
    const delta = e.deltaY > 0 ? 30 : -30
    const maxScroll = Math.max(0, this.scrollParams.totalHeight - this.scrollParams.viewHeight)
    this.targetScrollY = Math.max(0, Math.min(maxScroll, this.targetScrollY + delta))
  }

  startTicker() {
    if (this._tickerCallback) return
    this._tickerCallback = () => this.update()
    this.app.ticker.add(this._tickerCallback)
  }

  stopTicker() {
    if (this._tickerCallback) {
      this.app.ticker.remove(this._tickerCallback)
      this._tickerCallback = null
    }
  }

  update() {
    if (!this.scrollContainer) return
    
    if (Math.abs(this.scrollY - this.targetScrollY) > 0.5) {
      this.scrollY += (this.targetScrollY - this.scrollY) * 0.15
      this.scrollContainer.y = -this.scrollY
      
      if (this.scrollbar && this.scrollParams) {
        const maxScroll = Math.max(0, this.scrollParams.totalHeight - this.scrollParams.viewHeight)
        const ratio = maxScroll > 0 ? this.scrollY / maxScroll : 0
        const track = this.scrollParams.trackHeight - this.scrollParams.scrollbarHeight
        this.scrollbar.y = -this.scrollParams.viewHeight/2 + 5 + ratio * track
      }
    }
  }

  onClose() {
    // Очищаем filters чтобы избежать утечек
    this.cardSprites.forEach(item => {
      if (item.card) {
        item.card.filters = null
      }
    })
    this.cardSprites = []
    this.stopTicker()
    if (this.app.stage) {
      this.app.stage.off('wheel', this.onWheel, this)
    }
  }
}