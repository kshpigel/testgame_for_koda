import * as PIXI from 'pixi.js'
import { EventEmitter } from 'events'
import { FONT } from './data/fonts.js'
import { soundManager } from './audio/sound_manager.js'
import { Card, CARD_CONFIG } from './ui/card.js'
import { Circle } from './ui/circle.js'
import { Button } from './ui/button.js'

// Импорт ассетов
const assets = {
  cardBack: '/assets/img/card_back.png',
  battleBg: '/assets/img/battle_bg/bg2.png',
  victory: '/assets/img/victory.png',
  fail: '/assets/img/fail.jpg'
}

export class Battle extends EventEmitter {
  constructor(app, deck, cardTypes, enemyData, game) {
    super()
    this.app = app
    this.deck = [...deck]
    this.cardTypes = cardTypes
    this.enemyData = enemyData
    this.game = game
    
    this.container = new PIXI.Container()
    this.cards = []
    this.selectedCards = []
    this.currentDeck = []
    
    this.maxCards = 5
    this.activeCards = 0
    this.cntReset = 3
    this.cntSteps = 4
    this.defCntSteps = 4
    this.enemyHealth = enemyData.health
    
    // Хранилище баффов Священника для предотвращения мухлежа
    this.priestBuffs = {} // { targetCardId: value }
    
    this.isAnimating = false
  }

  start() {
    // Начинаем загрузку ассетов
    this.loadAssets()
  }

  async loadAssets() {
    // Используем PIXI.Assets для загрузки - он сам кеширует
    // Сначала загружаем все нужные ассеты
    const urls = new Set()
    
    urls.add(this.enemyData.image_bg || assets.battleBg)
    urls.add(assets.cardBack)
    urls.add(assets.victory)
    urls.add(assets.fail)
    
    this.cardTypes.forEach(type => {
      if (type.image) urls.add(type.image)
      if (type.image_bg) urls.add(type.image_bg)
    })
    
    if (this.enemyData.image) urls.add(this.enemyData.image)
    if (this.enemyData.image_bg) urls.add(this.enemyData.image_bg)
    
    // Загружаем все уникальные URL
    await PIXI.Assets.load(Array.from(urls))
    
    // Создаем маппинг для удобного доступа
    this.assets = {
      battleBg: { texture: PIXI.Assets.get(this.enemyData.image_bg || assets.battleBg) },
      cardBack: { texture: PIXI.Assets.get(assets.cardBack) },
      victory: { texture: PIXI.Assets.get(assets.victory) },
      fail: { texture: PIXI.Assets.get(assets.fail) },
      enemy: this.enemyData.image ? { texture: PIXI.Assets.get(this.enemyData.image) } : null
    }
    
    this.cardTypes.forEach(type => {
      if (type.image) this.assets[`card_${type.type}`] = { texture: PIXI.Assets.get(type.image) }
      if (type.image_bg) this.assets[`card_bg_${type.type}`] = { texture: PIXI.Assets.get(type.image_bg) }
    })
    
    this.onAssetsLoaded()
  }

  onAssetsLoaded() {
    this.prepareDeck()
    this.render()
    this.app.stage.addChild(this.container)
    this.container.alpha = 0
    this.fadeIn()
    this.dealCards(8)
    this.emit('ready')
  }

  prepareDeck() {
    this.currentDeck = this.deck.map(typeId => {
      return this.cardTypes.find(t => t.type === typeId)
    }).filter(Boolean)
    this.currentDeck.sort(() => Math.random() - 0.5)
  }

  dealCards(cnt) {
    const cardsToDeal = Math.min(cnt, this.currentDeck.length)
    
    for (let i = 0; i < cardsToDeal; i++) {
      setTimeout(() => {
        const cardData = this.currentDeck.pop()
        if (cardData) {
          this.addCard(cardData)
          // После добавления всех карт - пересчитываем позиции
          if (i === cardsToDeal - 1) {
            setTimeout(() => this.layoutCards(), cardsToDeal * 100 + 300)
          }
          this.updateUI()
        }
      }, i * 100)
    }
  }

  addCard(cardData) {
    const card = new Card(cardData, { 
      handIndex: this.cards.length,
      width: CARD_CONFIG.width,
      height: CARD_CONFIG.height
    })
    
    // Загружаем фоновое изображение (image_bg)
    if (this.assets && this.assets[`card_bg_${cardData.type}`]) {
      card.loadBgImage(this.assets[`card_bg_${cardData.type}`].texture)
    }
    
    // Загружаем изображение героя (image)
    if (this.assets && this.assets[`card_${cardData.type}`]) {
      card.loadHeroImage(this.assets[`card_${cardData.type}`].texture)
    }
    
    card.on('pointerdown', () => this.onCardClick(card))
    this.container.addChild(card)
    
    // Позиция колоды (откуда вылетает карта) - по центру колоды
    const deckX = this.app.screen.width - CARD_CONFIG.width / 2 - 30
    const deckY = this.app.screen.height - CARD_CONFIG.height / 2 - 40
    
    // Начальная позиция - из колоды
    card.x = deckX
    card.y = deckY
    card.scale.set(0.1)
    
    // Добавляем в массив и рассчитываем позицию
    this.cards.push(card)
    this.layoutCards()
    
    // Анимация появления карты - летит из колоды в руку
    this.animateCardIn(card)
  }
  
  animateCardIn(card) {
    const targetX = card.targetX
    const targetY = card.targetY
    const startX = card.x
    const startY = card.y
    
    let progress = 0
    const animate = () => {
      progress += 0.04
      if (progress >= 1) {
        card.x = targetX
        card.y = targetY
        card.scale.set(1)
      } else {
        // Ease out cubic
        const t = 1 - Math.pow(1 - progress, 3)
        
        card.x = startX + (targetX - startX) * t
        card.y = startY + (targetY - startY) * t
        card.scale.set(0.1 + 0.9 * t)
        requestAnimationFrame(animate)
      }
    }
    animate()
  }
  
  animateCardOut(card, onComplete) {
    const startX = card.x
    const startY = card.y
    const targetY = this.app.screen.height + 300
    
    let progress = 0
    const animate = () => {
      progress += 0.03
      if (progress >= 1) {
        card.y = targetY
        card.scale.set(0.2)
        if (onComplete) onComplete()
      } else {
        // Ускорение вниз
        const t = progress
        const ease = t * t * t
        
        card.x = startX
        card.y = startY + (targetY - startY) * ease
        card.scale.set(1 - 0.8 * ease)
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  layoutCards() {
    const handAreaY = this.app.screen.height - 15
    const cardWidth = CARD_CONFIG.width
    const cardHeight = CARD_CONFIG.height
    const spacing = -10
    const totalWidth = this.cards.length * (cardWidth + spacing) - spacing
    const startX = (this.app.screen.width - totalWidth) / 2

    this.cards.forEach((card, index) => {
      card.targetX = startX + index * (cardWidth + spacing)
      card.targetY = handAreaY
    })
  }

  onCardClick(card) {
    if (this.isAnimating) return
    
    if (card.isSelected) {
      card.deselect()
      this.selectedCards = this.selectedCards.filter(c => c !== card)
      this.activeCards--
    } else {
      if (this.activeCards >= this.maxCards) return
      
      card.select()
      this.selectedCards.push(card)
      this.activeCards++
    }
    
    this.applyBuffs()
    this.updateUI()
  }

  applyBuffs() {
    // Полностью очищаем все баффы
    this.cards.forEach(card => card.clearBuffs())
    
    // Применяем баффы от всех карт в руке
    this.cards.forEach(card => {
      const cardType = this.cardTypes.find(t => t.type === card.cardData.type)
      if (cardType && cardType.getBuff) {
        cardType.getBuff(card, this)
      }
    })
  }

  applySkills() {
    // Тип 6: Лучница - если в руке 4+ лучниц, добавляется +1 ход
    const archerCount = this.selectedCards.filter(c => c.cardData.type === 6).length
    if (archerCount >= 4 && archerCount === this.selectedCards.length) {
      this.cntSteps++
      setTimeout(() => {
        console.log('Ход прибавлен!')
      }, 100)
    }
    
    // Вызываем getSkill из cardTypes для каждой выбранной карты
    this.selectedCards.forEach(selectedCard => {
      const cardType = this.cardTypes.find(t => t.type === selectedCard.cardData.type)
      if (cardType && cardType.getSkill) {
        cardType.getSkill(selectedCard, this)
      }
    })
  }

  playCards() {
    if (this.isAnimating || this.cntSteps <= 0 || this.selectedCards.length <= 0) return
    
    this.isAnimating = true
    
    // Применяем скиллы перед ходом
    this.applySkills()
    
    let summ = 0
    this.selectedCards.forEach(card => {
      summ += card.getValue()
    })
    
    this.enemyHealth -= summ
    this.cntSteps--
    
    soundManager.play('attack')
    this.showDamage(summ)
    
    setTimeout(() => {
      if (this.enemyHealth <= 0) {
        this.enemyHealth = 0
        this.showVictory()
      } else if (this.cntSteps <= 0) {
        this.showDefeat()
      } else {
        this.resetSelectedCards()
      }
      this.isAnimating = false
    }, 1000)
  }

  resetSelectedCards() {
    // Очищаем баффы Священника после хода
    this.priestBuffs = {}
    
    const cardsToRemove = [...this.selectedCards]
    let removedCount = 0
    
    cardsToRemove.forEach((card, index) => {
      setTimeout(() => {
        this.animateCardOut(card, () => {
          this.cards = this.cards.filter(c => c !== card)
          this.container.removeChild(card)
          removedCount++
          
          // Когда все карты улетели - добираем новые
          if (removedCount === cardsToRemove.length) {
            const cardsNeeded = 8 - this.cards.length
            if (cardsNeeded > 0) {
              this.dealCards(cardsNeeded)
            }
            this.updateUI()
          }
        })
      }, index * 100)
    })
    
    this.selectedCards = []
    this.activeCards = 0
  }

  resetCards() {
    if (this.cntReset <= 0 || this.selectedCards.length === 0) return
    
    this.cntReset--
    this.priestBuffs = {}
    
    const cardsToRemove = [...this.selectedCards]
    let removedCount = 0
    
    cardsToRemove.forEach((card, index) => {
      setTimeout(() => {
        this.animateCardOut(card, () => {
          this.cards = this.cards.filter(c => c !== card)
          this.container.removeChild(card)
          removedCount++
          
          if (removedCount === cardsToRemove.length) {
            const cardsNeeded = 8 - this.cards.length
            if (cardsNeeded > 0) {
              this.dealCards(cardsNeeded)
            }
            this.updateUI()
          }
        })
      }, index * 100)
    })
    
    this.selectedCards = []
    this.activeCards = 0
  }

  showDamage(amount) {
    // Анимация удара - красная вспышка
    const hitEffect = new PIXI.Graphics()
    hitEffect.beginFill(0xff0000, 0.3)
    hitEffect.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    hitEffect.endFill()
    this.container.addChild(hitEffect)
    
    let hitAlpha = 0.3
    const fadeHit = () => {
      hitAlpha -= 0.05
      hitEffect.alpha = hitAlpha
      if (hitAlpha > 0) {
        requestAnimationFrame(fadeHit)
      } else {
        this.container.removeChild(hitEffect)
        hitEffect.destroy()
      }
    }
    fadeHit()
    
    // Текст урона
    const style = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#ff4444',
      stroke: '#000000',
      strokeThickness: 4
    })
    
    const text = new PIXI.Text(`-${amount}`, style)
    text.anchor.set(0.5)
    text.x = this.app.screen.width / 2
    text.y = 200
    this.container.addChild(text)
    
    let alpha = 1
    let y = 200
    const animate = () => {
      alpha -= 0.02
      y -= 2
      text.alpha = alpha
      text.y = y
      
      if (alpha > 0) {
        requestAnimationFrame(animate)
      } else {
        this.container.removeChild(text)
        text.destroy()
      }
    }
    animate()
  }

  showVictory() {
    const points = this.enemyData.health + this.cntSteps * 10
    
    // Затемнение
    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 0.7)
    overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    overlay.endFill()
    this.container.addChild(overlay)
    
    // Изображение победы
    if (this.assets && this.assets.victory && this.assets.victory.texture) {
      const victorySprite = new PIXI.Sprite(this.assets.victory.texture)
      victorySprite.anchor.set(0.5)
      victorySprite.x = this.app.screen.width / 2
      victorySprite.y = this.app.screen.height / 2
      const maxW = this.app.screen.width * 0.8
      const maxH = this.app.screen.height * 0.8
      victorySprite.scale.set(Math.min(maxW / victorySprite.texture.width, maxH / victorySprite.texture.height))
      this.container.addChild(victorySprite)
    }
    
    // Текст победы
    const style = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 64,
      fontWeight: 'bold',
      fill: '#00ff00',
      stroke: '#000000',
      strokeThickness: 4
    })
    const text = new PIXI.Text('ПОБЕДА!', style)
    text.anchor.set(0.5)
    text.x = this.app.screen.width / 2
    text.y = this.app.screen.height / 2 - 100
    this.container.addChild(text)
    
    soundManager.play('battleVictory')
    
    setTimeout(() => {
      this.emit('victory', points)
      this.emit('end')
    }, 2000)
  }

  showDefeat() {
    soundManager.play('battleFail')
    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 0.7)
    overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    overlay.endFill()
    this.container.addChild(overlay)
    
    // Изображение поражения
    if (this.assets && this.assets.fail && this.assets.fail.texture) {
      const failSprite = new PIXI.Sprite(this.assets.fail.texture)
      failSprite.anchor.set(0.5)
      failSprite.x = this.app.screen.width / 2
      failSprite.y = this.app.screen.height / 2
      const maxW = this.app.screen.width * 0.8
      const maxH = this.app.screen.height * 0.8
      failSprite.scale.set(Math.min(maxW / failSprite.texture.width, maxH / failSprite.texture.height))
      this.container.addChild(failSprite)
    }
    
    const style = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 64,
      fontWeight: 'bold',
      fill: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4
    })
    const text = new PIXI.Text('ПОРАЖЕНИЕ', style)
    text.anchor.set(0.5)
    text.x = this.app.screen.width / 2
    text.y = this.app.screen.height / 2 - 100
    this.container.addChild(text)
    
    setTimeout(() => {
      this.emit('defeat')
      this.emit('end')
    }, 2000)
  }

  render() {
    this.container.removeChildren()
    
    // Фон боя (cover)
    if (this.assets && this.assets.battleBg && this.assets.battleBg.texture) {
      const bg = new PIXI.Sprite(this.assets.battleBg.texture)
      this.scaleToCover(bg, this.app.screen.width, this.app.screen.height)
      this.container.addChild(bg)
    } else if (this.enemyData.image_bg) {
      const bg = PIXI.Sprite.from(this.enemyData.image_bg)
      this.scaleToCover(bg, this.app.screen.width, this.app.screen.height)
      this.container.addChild(bg)
    } else {
      const bg = new PIXI.Graphics()
      bg.beginFill(0x1a1a2e)
      bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
      bg.endFill()
      this.container.addChild(bg)
    }
    
    this.renderEnemy()
    this.renderControls()
    this.renderDeckInfo()
  }

  renderEnemy() {
    const enemyContainer = new PIXI.Container()
    enemyContainer.x = this.app.screen.width / 2
    enemyContainer.y = 180
    
    // Изображение врага
    const enemyMaxHeight = 200
    if (this.assets && this.assets.enemy && this.assets.enemy.texture) {
      const enemySprite = new PIXI.Sprite(this.assets.enemy.texture)
      enemySprite.anchor.set(0.5, 1)
      const scale = Math.min(1, enemyMaxHeight / enemySprite.texture.height)
      enemySprite.scale.set(scale)
      enemySprite.y = 0
      enemyContainer.addChild(enemySprite)
    } else if (this.enemyData.image) {
      const enemySprite = PIXI.Sprite.from(this.enemyData.image)
      enemySprite.anchor.set(0.5, 1)
      const scale = Math.min(1, enemyMaxHeight / enemySprite.texture.height)
      enemySprite.scale.set(scale)
      enemySprite.y = 0
      enemyContainer.addChild(enemySprite)
    }
    
    // Имя врага с тенью
    const nameShadow = new PIXI.Text(this.enemyData.name, {
      fontFamily: FONT,
      fontSize: 28,
      fontWeight: 'bold',
      fill: '#000000'
    })
    nameShadow.anchor.set(0.5, 1)
    nameShadow.x = enemyContainer.x + 2
    nameShadow.y = 100 + 2
    this.container.addChild(nameShadow)
    
    const nameStyle = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 28,
      fontWeight: 'bold',
      fill: '#ffffff'
    })
    const name = new PIXI.Text(this.enemyData.name, nameStyle)
    name.anchor.set(0.5, 1)
    name.x = enemyContainer.x
    name.y = 100
    this.container.addChild(name)
    
    // Здоровье врага
    const healthBg = new PIXI.Graphics()
    healthBg.beginFill(0x000000, 0.7)
    healthBg.drawRoundedRect(enemyContainer.x - 80, 120, 160, 35, 10)
    healthBg.endFill()
    this.container.addChild(healthBg)
    
    const healthStyle = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 24,
      fontWeight: 'bold',
      fill: '#ff6666'
    })
    const health = new PIXI.Text(`HP: ${this.enemyHealth}`, healthStyle)
    health.anchor.set(0.5)
    health.x = enemyContainer.x
    health.y = 137
    this.container.addChild(health)
    
    this.enemyHealthText = health
  }

  renderControls() {
    const btnY = this.app.screen.height - 280
    
    // Кнопка "Ход"
    const playBtn = this.createButton('Сделать ход!', 0x39751b, () => this.playCards())
    playBtn.x = this.app.screen.width / 2 - 100
    playBtn.y = btnY
    this.container.addChild(playBtn)
    
    // Кнопка "Сброс"
    const resetBtn = this.createButton('Сброс', 0x8c1300, () => this.resetCards())
    resetBtn.x = this.app.screen.width / 2 + 100
    resetBtn.y = btnY
    this.container.addChild(resetBtn)
    
    // Счетчики
    const infoStyle = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 20,
      fill: '#ffffff'
    })
    
    const stepsText = new PIXI.Text(`Ходы: ${this.cntSteps}`, infoStyle)
    stepsText.anchor.set(0.5)
    stepsText.x = this.app.screen.width / 2 + 70
    stepsText.y = btnY - 50
    this.container.addChild(stepsText)
    this.stepsText = stepsText
    
    const resetsText = new PIXI.Text(`Сбросы: ${this.cntReset}`, infoStyle)
    resetsText.anchor.set(0.5)
    resetsText.x = this.app.screen.width / 2 - 80
    resetsText.y = btnY - 50
    this.container.addChild(resetsText)
    this.resetsText = resetsText
  }

  renderDeckInfo() {
    // Колода с рубашкой
    const deckContainer = new PIXI.Container()
    deckContainer.x = this.app.screen.width - CARD_CONFIG.width - 30
    deckContainer.y = this.app.screen.height - CARD_CONFIG.height - 40
    deckContainer.eventMode = 'static'
    deckContainer.cursor = 'pointer'
    
    // Карточка-рубашка
    const cardW = CARD_CONFIG.width
    const cardH = CARD_CONFIG.height
    
    const cardBack = new PIXI.Graphics()
    cardBack.lineStyle(2, 0xffffff)
    cardBack.beginFill(0x282424)
    cardBack.drawRoundedRect(0, 0, cardW, cardH, 8)
    cardBack.endFill()
    deckContainer.addChild(cardBack)
    
    // Текстура рубашки если загружена
    if (this.assets && this.assets.cardBack && this.assets.cardBack.texture) {
      const backSprite = new PIXI.Sprite(this.assets.cardBack.texture)
      backSprite.width = cardW
      backSprite.height = cardH
      deckContainer.addChild(backSprite)
    }
    
    // Кружочек с количеством карт
    this.deckCountCircle = new Circle({
      x: cardW/2 + 3,
      y: cardH -10,
      radius: 22,
      bgColor: 0x3a3a3a,
      borderColor: 0x888888,
      text: `${this.currentDeck.length}`
    })
    deckContainer.addChild(this.deckCountCircle)
    
    // Подпись "Колода"
    const labelText = new PIXI.Text('Колода', {
      fontFamily: FONT,
      fontSize: 14,
      fill: '#aaaaaa'
    })
    labelText.anchor.set(0.5)
    labelText.x = cardW / 2
    labelText.y = cardH + 20
    deckContainer.addChild(labelText)
    
    // Hover эффект с анимацией scale
    deckContainer.targetScale = 1
    
    deckContainer.on('pointerover', () => {
      deckContainer.targetScale = 1.05
      cardBack.clear()
      cardBack.lineStyle(2, 0x4a9c6d)
      cardBack.beginFill(0x3a5a4a)
      cardBack.drawRoundedRect(0, 0, cardW, cardH, 8)
      cardBack.endFill()
    })
    
    deckContainer.on('pointerout', () => {
      deckContainer.targetScale = 1
      cardBack.clear()
      cardBack.lineStyle(2, 0xffffff)
      cardBack.beginFill(0x282424)
      cardBack.drawRoundedRect(0, 0, cardW, cardH, 8)
      cardBack.endFill()
    })
    
    // Клик - показать меню колоды
    deckContainer.on('pointerdown', () => {
      soundManager.play('click')
      this.showDeckMenu()
    })
    
    this.container.addChild(deckContainer)
    this.deckContainer = deckContainer
  }

  showDeckMenu() {
    // Меню колоды
    const menuContainer = new PIXI.Container()
    menuContainer.x = this.app.screen.width / 2
    menuContainer.y = this.app.screen.height / 2
    
    // Затемнение фона
    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 0.8)
    overlay.drawRect(-this.app.screen.width/2, -this.app.screen.height/2, this.app.screen.width, this.app.screen.height)
    overlay.endFill()
    menuContainer.addChild(overlay)
    
    // Панель меню
    const panelW = 600
    const panelH = 400
    const panel = new PIXI.Graphics()
    panel.beginFill(0x282424)
    panel.lineStyle(3, 0x4a9c6d)
    panel.drawRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 20)
    panel.endFill()
    menuContainer.addChild(panel)
    
    // Заголовок
    const title = new PIXI.Text('Колода', {
      fontFamily: FONT,
      fontSize: 28,
      fontWeight: 'bold',
      fill: '#ffffff'
    })
    title.anchor.set(0.5)
    title.y = -panelH/2 + 30
    menuContainer.addChild(title)
    
    // Кнопка закрытия
    const closeBtn = new PIXI.Container()
    closeBtn.x = panelW/2 - 30
    closeBtn.y = -panelH/2 + 30
    closeBtn.eventMode = 'static'
    closeBtn.cursor = 'pointer'
    
    const closeX = new PIXI.Text('✕', {
      fontFamily: FONT,
      fontSize: 24,
      fill: '#ff6666'
    })
    closeBtn.addChild(closeX)
    
    closeBtn.on('pointerdown', () => {
      soundManager.play('click')
      this.container.removeChild(menuContainer)
    })
    menuContainer.addChild(closeBtn)
    
    // Сетка карт
    const cardW = CARD_CONFIG.width
    const cardH = CARD_CONFIG.height
    const startX = -panelW/2 + 50
    const startY = -panelH/2 + 80
    const cols = 8
    
    // Все типы карт в колоде
    const allCardTypes = this.cardTypes.filter(ct => this.deck.includes(ct.type))
    
    allCardTypes.forEach((cardType, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      
      const card = new Card(cardType, { 
        width: cardW, 
        height: cardH 
      })
      
      card.x = startX + col * (cardW + 10)
      card.y = startY + row * (cardH + 10)
      
      // Если карта использована (нет в currentDeck) - серый
      if (!this.currentDeck.find(c => c.type === cardType.type)) {
        card.setDisabled(true)
      }
      
      // Загружаем фоновое изображение (image_bg)
      if (this.assets && this.assets[`card_bg_${cardType.type}`]) {
        card.loadBgImage(this.assets[`card_bg_${cardType.type}`].texture)
      }
      
      // Загружаем изображение героя (image)
      if (this.assets && this.assets[`card_${cardType.type}`]) {
        card.loadHeroImage(this.assets[`card_${cardType.type}`].texture)
      }
      
      menuContainer.addChild(card)
    })
    
    // Закрытие по клику вне панели
    overlay.eventMode = 'static'
    overlay.on('pointerdown', () => {
      this.container.removeChild(menuContainer)
    })
    
    this.container.addChild(menuContainer)
  }

  createButton(text, color, onClick) {
    return new Button(text, {
      width: 140,
      height: 50,
      color: color,
      fontSize: 18,
      app: this.app,
      onClick: onClick
    })
  }

  updateUI() {
    if (this.enemyHealthText) {
      this.enemyHealthText.text = `HP: ${this.enemyHealth}`
    }
    if (this.stepsText) {
      this.stepsText.text = `Ходы: ${this.cntSteps}`
    }
    if (this.resetsText) {
      this.resetsText.text = `Сбросы: ${this.cntReset}`
    }
    if (this.deckCountCircle) {
      this.deckCountCircle.setText(`${this.currentDeck.length}`)
    }
    
    this.selectedCards.forEach(card => card.updateValue())
  }

  fadeIn() {
    const animate = () => {
      this.container.alpha += 0.05
      if (this.container.alpha < 1) {
        requestAnimationFrame(animate)
      }
    }
    animate()
    
    // Запускаем игровой цикл для анимаций карт
    this.app.ticker.add(() => this.gameLoop())
  }

  gameLoop() {
    // Обновляем все карты (включая позиции)
    this.cards.forEach(card => {
      card.update()
      
      // Плавное перемещение к целевой позиции
      if (card.targetX !== undefined && Math.abs(card.x - card.targetX) > 0.5) {
        card.x += (card.targetX - card.x) * 0.15
      }
      if (card.targetY !== undefined && Math.abs(card.y - card.targetY) > 0.5) {
        card.y += (card.targetY - card.y) * 0.15
      }
    })
    
    // Анимация scale для колоды
    if (this.deckContainer && this.deckContainer.targetScale !== undefined) {
      const diff = this.deckContainer.targetScale - this.deckContainer.scale.x
      if (Math.abs(diff) > 0.001) {
        this.deckContainer.scale.set(this.deckContainer.scale.x + diff * 0.15)
      }
    }
  }

  fadeOut(callback) {
    // Останавливаем тикер
    this.app.ticker.remove(() => this.gameLoop())
    
    const animate = () => {
      this.container.alpha -= 0.05
      if (this.container.alpha <= 0) {
        if (callback) callback()
      } else {
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  hide() {
    this.fadeOut(() => {
      this.app.stage.removeChild(this.container)
    })
  }

  cleanup() {
    this.container.removeChildren()
    this.cards = []
    this.selectedCards = []
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
    this.render()
  }
}