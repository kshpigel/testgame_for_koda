import * as PIXI from 'pixi.js'
import { EventEmitter } from 'events'
import { FONT } from './data/fonts.js'
import { soundManager } from './audio/sound_manager.js'

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
    this.enemyHealth = enemyData.health
    
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
        }
      }, i * 100)
    }
  }

  addCard(cardData) {
    const card = new CardSprite(this.app, cardData, this.cards.length, this.assets)
    card.on('click', () => this.onCardClick(card))
    this.cards.push(card)
    this.container.addChild(card.container)
    this.layoutCards()
  }

  layoutCards() {
    const handAreaY = this.app.screen.height - 180
    const cardWidth = 120
    const cardHeight = 160
    const spacing = 20
    const totalWidth = this.cards.length * (cardWidth + spacing) - spacing
    const startX = (this.app.screen.width - totalWidth) / 2

    this.cards.forEach((card, index) => {
      const targetX = startX + index * (cardWidth + spacing)
      card.setPosition(targetX, handAreaY)
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
    this.cards.forEach(card => card.clearBuffs())
    
    this.selectedCards.forEach(selectedCard => {
      this.applyCardBuffs(selectedCard)
    })
  }

  applyCardBuffs(selectedCard) {
    const type = selectedCard.cardData.type
    
    if (type === 1) {
      this.cards.forEach(card => {
        if ([2, 3, 5].includes(card.cardData.type) && !card.isSelected) {
          card.addBuff(card.cardData.value)
        }
      })
    }
    
    if (type === 3) {
      this.cards.forEach(card => {
        if (card !== selectedCard && !card.isSelected) {
          card.addBuff(3)
        }
      })
    }
    
    if (type === 4) {
      const berserkCount = this.selectedCards.filter(c => c.cardData.type === 4).length
      if (berserkCount === 3 && this.selectedCards.length === 3) {
        this.selectedCards.forEach(c => {
          if (c.cardData.type === 4) {
            c.addBuff(this.cntSteps === 4 ? 25 : 20)
          }
        })
      }
    }
    
    if (type === 7) {
      this.cards.forEach(card => {
        if (!card.isSelected) {
          card.addBuff(3)
        }
      })
    }
    
    if (type === 8 && !selectedCard.isSelected) {
      selectedCard.addBuff(this.currentDeck.length - 1)
    }
    
    if (type === 11 && selectedCard.isSelected) {
      this.cards.forEach(card => {
        if (card !== selectedCard && card.isSelected) {
          card.addBuff(Math.floor(Math.random() * 5) + 1)
        }
      })
    }
  }

  playCards() {
    if (this.isAnimating || this.cntSteps <= 0 || this.selectedCards.length <= 0) return
    
    this.isAnimating = true
    
    let summ = 0
    this.selectedCards.forEach(card => {
      summ += card.getValue()
      card.applySkill()
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
    this.selectedCards.forEach(card => {
      this.cards = this.cards.filter(c => c !== card)
      this.container.removeChild(card.container)
    })
    this.selectedCards = []
    this.activeCards = 0
    
    this.dealCards(this.selectedCards.length || 3)
    
    this.updateUI()
  }

  resetCards() {
    if (this.cntReset <= 0 || this.selectedCards.length === 0) return
    
    this.cntReset--
    
    const cnt = this.selectedCards.length
    this.selectedCards.forEach(card => {
      this.cards = this.cards.filter(c => c !== card)
      this.container.removeChild(card.container)
    })
    this.selectedCards = []
    this.activeCards = 0
    
    this.dealCards(cnt)
    this.updateUI()
  }

  showDamage(amount) {
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
    
    setTimeout(() => {
      soundManager.play('battleVictory')
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
    stepsText.x = this.app.screen.width / 2 - 100
    stepsText.y = btnY - 40
    this.container.addChild(stepsText)
    this.stepsText = stepsText
    
    const resetsText = new PIXI.Text(`Сбросы: ${this.cntReset}`, infoStyle)
    resetsText.x = this.app.screen.width / 2 + 100
    resetsText.y = btnY - 40
    this.container.addChild(resetsText)
    this.resetsText = resetsText
  }

  renderDeckInfo() {
    const style = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 18,
      fill: '#ffffff'
    })
    
    const deckText = new PIXI.Text(`В колоде: ${this.currentDeck.length}`, style)
    deckText.x = 20
    deckText.y = this.app.screen.height - 30
    this.container.addChild(deckText)
    this.deckText = deckText
  }

  createButton(text, color, onClick) {
    const container = new PIXI.Container()
    
    const bg = new PIXI.Graphics()
    bg.beginFill(color)
    bg.drawRoundedRect(0, 0, 140, 50, 25)
    bg.endFill()
    container.addChild(bg)
    
    // Текст кнопки
    const style = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#ffffff'
    })
    const label = new PIXI.Text(text, style)
    label.anchor.set(0.5)
    label.x = 70
    label.y = 25
    container.addChild(label)
    
    container.eventMode = 'static'
    container.cursor = 'pointer'
    
    // Эффекты при наведении
    container.on('pointerover', () => {
      bg.clear()
      bg.beginFill(color)
      bg.drawRoundedRect(-3, -3, 146, 56, 27)
      bg.endFill()
    })
    
    container.on('pointerout', () => {
      bg.clear()
      bg.beginFill(color)
      bg.drawRoundedRect(0, 0, 140, 50, 25)
      bg.endFill()
    })
    
    container.on('pointerdown', onClick)
    
    return container
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
    if (this.deckText) {
      this.deckText.text = `В колоде: ${this.currentDeck.length}`
    }
    
    this.selectedCards.forEach(card => card.updateValueText())
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
    // Обновляем все карты
    this.cards.forEach(card => card.update())
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

class CardSprite extends EventEmitter {
  constructor(app, cardData, index, assets) {
    super()
    this.app = app
    this.cardData = cardData
    this.index = index
    this.isSelected = false
    this.buffs = []
    this.assets = assets
    
    this.container = new PIXI.Container()
    this.cardWidth = 120
    this.cardHeight = 160
    
    this.render()
  }

  render() {
    // Карточка - фон
    const bg = new PIXI.Graphics()
    bg.lineStyle(3, 0x333333)
    bg.beginFill(0x2a2a4a)
    bg.drawRoundedRect(0, 0, this.cardWidth, this.cardHeight, 10)
    bg.endFill()
    this.container.addChild(bg)
    
    // Фон карточки (изображение или цвет)
    if (this.assets && this.assets[`card_bg_${this.cardData.type}`] && this.assets[`card_bg_${this.cardData.type}`].texture) {
      const cardBg = new PIXI.Sprite(this.assets[`card_bg_${this.cardData.type}`].texture)
      cardBg.width = this.cardWidth
      cardBg.height = this.cardHeight
      cardBg.alpha = 0.3
      this.container.addChild(cardBg)
    }
    
    // Изображение карты
    if (this.assets && this.assets[`card_${this.cardData.type}`] && this.assets[`card_${this.cardData.type}`].texture) {
      const img = new PIXI.Sprite(this.assets[`card_${this.cardData.type}`].texture)
      img.anchor.set(0.5)
      img.x = this.cardWidth / 2
      img.y = this.cardHeight / 2 - 10
      const maxH = this.cardHeight - 40
      const maxW = this.cardWidth - 20
      const scale = Math.min(maxW / img.texture.width, maxH / img.texture.height)
      img.scale.set(scale)
      this.container.addChild(img)
    }
    
    // Название карты
    const nameStyle = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 12,
      fill: '#ffffff'
    })
    const name = new PIXI.Text(this.cardData.name, nameStyle)
    name.anchor.set(0.5, 1)
    name.x = this.cardWidth / 2
    name.y = 25
    this.container.addChild(name)
    
    // Значение карты в кружочке
    const valueBg = new PIXI.Graphics()
    valueBg.beginFill(0x39751b)
    valueBg.drawCircle(this.cardWidth / 2, 40, 18)
    valueBg.endFill()
    this.container.addChild(valueBg)
    
    this.valueText = new PIXI.Text(String(this.cardData.value), {
      fontFamily: FONT,
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#ffffff'
    })
    this.valueText.anchor.set(0.5)
    this.valueText.x = this.cardWidth / 2
    this.valueText.y = 40
    this.container.addChild(this.valueText)
    
    // Интерактивность
    this.container.eventMode = 'static'
    this.container.cursor = 'pointer'
    this.container.on('pointerdown', () => {
      this.emit('click')
    })
    
    // Анимация появления
    this.container.scale.set(0)
    this.animateIn()
  }

  animateIn() {
    let scale = 0
    const animate = () => {
      scale += 0.1
      if (scale < 1) {
        this.container.scale.set(scale)
        requestAnimationFrame(animate)
      } else {
        this.container.scale.set(1)
      }
    }
    animate()
  }

  setPosition(x, y) {
    this.baseY = y
    this.targetY = y
    this.container.x = x
    this.container.y = y
  }

  update() {
    // Плавная анимация перемещения
    if (this.container.y !== this.targetY) {
      const diff = this.targetY - this.container.y
      this.container.y += diff * 0.2
      if (Math.abs(diff) < 0.5) {
        this.container.y = this.targetY
      }
    }
  }

  select() {
    this.isSelected = true
    this.targetY = this.baseY - 20
    
    // Подсветка
    const highlight = new PIXI.Graphics()
    highlight.lineStyle(3, 0x00ff00)
    highlight.drawRoundedRect(-3, -3, this.cardWidth + 6, this.cardHeight + 6, 12)
    this.container.addChild(highlight)
    this.highlight = highlight
  }

  deselect() {
    this.isSelected = false
    this.targetY = this.baseY
    
    if (this.highlight) {
      this.container.removeChild(this.highlight)
      this.highlight = null
    }
  }

  addBuff(value) {
    this.buffs.push(value)
    this.updateValueText()
  }

  clearBuffs() {
    this.buffs = []
    this.updateValueText()
  }

  getValue() {
    let value = this.cardData.value
    this.buffs.forEach(buff => {
      value += buff
    })
    return value
  }

  updateValueText() {
    const value = this.getValue()
    this.valueText.text = String(value)
    
    if (this.buffs.length > 0) {
      this.valueText.style.fill = '#00ff00'
    } else {
      this.valueText.style.fill = '#ffffff'
    }
  }

  applySkill() {
    // Логика умений карт
  }
}