import * as PIXI from 'pixi.js'
import { EventEmitter } from 'events'

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
    this.prepareDeck()
    this.render()
    this.app.stage.addChild(this.container)
    this.container.alpha = 0
    this.fadeIn()
    this.dealCards(8)
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
    const card = new CardSprite(this.app, cardData, this.cards.length)
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
    // Сброс всех баффов
    this.cards.forEach(card => card.clearBuffs())
    
    // Применяем баффы от выбранных карт
    this.selectedCards.forEach(selectedCard => {
      this.applyCardBuffs(selectedCard)
    })
  }

  applyCardBuffs(selectedCard) {
    const type = selectedCard.cardData.type
    
    // Копейщица (type 1) - баффает Ополченцев(2), Рыцарей(5), Князя(3)
    if (type === 1) {
      this.cards.forEach(card => {
        if ([2, 3, 5].includes(card.cardData.type) && !card.isSelected) {
          card.addBuff(card.cardData.value)
        }
      })
    }
    
    // Князь (type 3) - баффает все карты на +3
    if (type === 3) {
      this.cards.forEach(card => {
        if (card !== selectedCard && !card.isSelected) {
          card.addBuff(3)
        }
      })
    }
    
    // Берсерк (type 4) - +20 если выбраны 3 берсерка
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
    
    // Доктор (type 7) - баффает все невыбранные карты на +3
    if (type === 7) {
      this.cards.forEach(card => {
        if (!card.isSelected) {
          card.addBuff(3)
        }
      })
    }
    
    // Темный рыцарь (type 8) - сила = кол-во карт в колоде
    if (type === 8 && !selectedCard.isSelected) {
      selectedCard.addBuff(this.currentDeck.length - 1)
    }
    
    // Священник (type 11) - рандомный бафф 1-5
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
    
    // Анимация удара
    this.showDamage(summ)
    
    // Проверка победы/поражения
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
    // Удаляем выбранные карты
    this.selectedCards.forEach(card => {
      this.cards = this.cards.filter(c => c !== card)
      this.container.removeChild(card.container)
    })
    this.selectedCards = []
    this.activeCards = 0
    
    // Добавляем новые карты
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
      fontFamily: 'Arial',
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
    
    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 0.7)
    overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    overlay.endFill()
    this.container.addChild(overlay)
    
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 64,
      fontWeight: 'bold',
      fill: '#00ff00'
    })
    const text = new PIXI.Text('ПОБЕДА!', style)
    text.anchor.set(0.5)
    text.x = this.app.screen.width / 2
    text.y = this.app.screen.height / 2
    this.container.addChild(text)
    
    setTimeout(() => {
      this.emit('victory', points)
    }, 2000)
  }

  showDefeat() {
    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 0.7)
    overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    overlay.endFill()
    this.container.addChild(overlay)
    
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 64,
      fontWeight: 'bold',
      fill: '#ff0000'
    })
    const text = new PIXI.Text('ПОРАЖЕНИЕ', style)
    text.anchor.set(0.5)
    text.x = this.app.screen.width / 2
    text.y = this.app.screen.height / 2
    this.container.addChild(text)
    
    setTimeout(() => {
      this.emit('defeat')
    }, 2000)
  }

  render() {
    this.container.removeChildren()
    
    // Фон битвы
    if (this.enemyData.image_bg) {
      const bg = PIXI.Sprite.from(this.enemyData.image_bg)
      bg.width = this.app.screen.width
      bg.height = this.app.screen.height
      this.container.addChild(bg)
    } else {
      const bg = new PIXI.Graphics()
      bg.beginFill(0x1a1a2e)
      bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
      bg.endFill()
      this.container.addChild(bg)
    }
    
    // Враг
    this.renderEnemy()
    
    // Кнопки управления
    this.renderControls()
    
    // Информация о колоде
    this.renderDeckInfo()
  }

  renderEnemy() {
    const enemyContainer = new PIXI.Container()
    enemyContainer.x = this.app.screen.width / 2
    enemyContainer.y = 180
    
    // Изображение врага
    if (this.enemyData.image) {
      const enemySprite = PIXI.Sprite.from(this.enemyData.image)
      enemySprite.anchor.set(0.5)
      enemySprite.scale.set(2)
      enemyContainer.addChild(enemySprite)
    }
    
    // Имя врага
    const nameStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 28,
      fontWeight: 'bold',
      fill: '#ffffff'
    })
    const name = new PIXI.Text(this.enemyData.name, nameStyle)
    name.anchor.set(0.5, 1)
    name.y = -80
    enemyContainer.addChild(name)
    
    // Здоровье врага
    const healthStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#ff6666'
    })
    const health = new PIXI.Text(`HP: ${this.enemyHealth}`, healthStyle)
    health.anchor.set(0.5, 0)
    health.y = -50
    enemyContainer.addChild(health)
    
    this.enemyHealthText = health
    this.container.addChild(enemyContainer)
  }

  renderControls() {
    const btnY = this.app.screen.height - 280
    
    // Кнопка "Ход"
    const playBtn = this.createButton('Сделать ход!', 0x4CAF50, () => this.playCards())
    playBtn.x = this.app.screen.width / 2 - 100
    playBtn.y = btnY
    this.container.addChild(playBtn)
    
    // Кнопка "Сброс"
    const resetBtn = this.createButton('Сброс', 0xf44336, () => this.resetCards())
    resetBtn.x = this.app.screen.width / 2 + 100
    resetBtn.y = btnY
    this.container.addChild(resetBtn)
    
    // Счетчики
    const infoStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
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
      fontFamily: 'Arial',
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
    bg.drawRoundedRect(0, 0, 140, 50, 10)
    bg.endFill()
    container.addChild(bg)
    
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial',
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
    
    // Обновляем сумму выбранных карт
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
  }

  fadeOut(callback) {
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

  resize(width, height) {
    this.render()
  }
}

class CardSprite extends EventEmitter {
  constructor(app, cardData, index) {
    super()
    this.app = app
    this.cardData = cardData
    this.index = index
    this.isSelected = false
    this.buffs = []
    
    this.container = new PIXI.Container()
    this.cardWidth = 120
    this.cardHeight = 160
    
    this.render()
  }

  render() {
    // Карточка
    const bg = new PIXI.Graphics()
    bg.lineStyle(3, 0x333333)
    bg.beginFill(0x2a2a4a)
    bg.drawRoundedRect(0, 0, this.cardWidth, this.cardHeight, 10)
    bg.endFill()
    this.container.addChild(bg)
    
    // Обложка
    const cardBg = PIXI.Sprite.from(this.cardData.image_bg)
    cardBg.width = this.cardWidth
    cardBg.height = this.cardHeight
    cardBg.alpha = 0.3
    this.container.addChild(cardBg)
    
    // Изображение карты
    if (this.cardData.image) {
      const img = PIXI.Sprite.from(this.cardData.image)
      img.anchor.set(0.5)
      img.x = this.cardWidth / 2
      img.y = this.cardHeight / 2 - 10
      img.scale.set(0.8)
      this.container.addChild(img)
    }
    
    // Название
    const nameStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: '#ffffff'
    })
    const name = new PIXI.Text(this.cardData.name, nameStyle)
    name.anchor.set(0.5, 1)
    name.x = this.cardWidth / 2
    name.y = 25
    this.container.addChild(name)
    
    // Значение
    this.valueText = new PIXI.Text(String(this.cardData.value), nameStyle)
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
  }

  setPosition(x, y) {
    this.container.x = x
    this.container.y = y
  }

  select() {
    this.isSelected = true
    this.container.y -= 20
    
    // Подсветка
    const highlight = new PIXI.Graphics()
    highlight.lineStyle(3, 0x00ff00)
    highlight.drawRoundedRect(-3, -3, this.cardWidth + 6, this.cardHeight + 6, 12)
    this.container.addChild(highlight)
    this.highlight = highlight
  }

  deselect() {
    this.isSelected = false
    this.container.y += 20
    
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
    // Лучница (type 6) - добавляет ход если 4+ в руке
    if (this.cardData.type === 6) {
      const archersCount = this.isSelected ? 1 : 0
      // Это упрощенная логика, полная реализация в оригинале
    }
    
    // Берсерк (type 4) - сбрасывает всех берсерков из колоды
    if (this.cardData.type === 4) {
      // Логика в battle.applyBuffs
    }
  }
}
