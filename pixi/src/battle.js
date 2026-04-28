import * as PIXI from 'pixi.js'
import { EventEmitter } from 'events'
import { FONT } from './data/fonts.js'
import { colors } from './data/colors.js'
import { log, config } from './data/config.js'
import { Z } from './data/z_index.js'
import { soundManager } from './audio/sound_manager.js'
import { battleStats } from './data/battle_stats.js'
import { Card, CARD_CONFIG } from './ui/card.js'
import { Circle } from './ui/circle.js'
import { Button } from './ui/button.js'
import { Modal } from './ui/modal.js'
import { TextNode } from './ui/text_node.js'
import { EnemyDisplay } from './ui/enemy_display.js'
import { HandRenderer } from './ui/hand_renderer.js'
import { CardGridRenderer } from './ui/card_grid_renderer.js'
import { BattleUI } from './ui/battle_ui.js'
import { CardAnimator } from './ui/card_animator.js'
import { BattleEffects } from './ui/battle_effects.js'
import { t } from './data/i18n.js'
import { toastManager } from './ui/toast_manager.js'

// Импорт ассетов
import { cardStyles, getCardStyle } from './data/card_styles.js'
import { registerDebuffs } from './data/debuffs/registry.js'

const assets = {
  cardBack: '/assets/img/card_back.png',
  battleBg: '/assets/img/battle_bg/bg2.png',
  victory: '/assets/img/victory.png',
  fail: '/assets/img/fail.jpg'
}

export class Battle extends EventEmitter {
  constructor(app, deck, cardTypes, enemyData, game, sleeve = null) {
    super()
    this.app = app
    this.deck = [...deck]
    this.cardTypes = cardTypes
    this.enemyData = enemyData
    this.game = game
    this.sleeve = sleeve
    
    this.container = new PIXI.Container()
    this.container.zIndex = 100 // Высокий zIndex для боя
    this.cards = []
    this.selectedCards = []
    this.currentDeck = []
    
    // HandRenderer для управления картами в руке
    this.handRenderer = null
    this._tickerCallback = null
    
    // BattleUI для кнопок и счётчиков
    this.battleUI = null
    
    // CardAnimator для анимаций карт
    this.cardAnimator = null
    
    // BattleEffects для эффектов
    this.battleEffects = null
    
    this.maxCards = 5
    this.activeCards = 0
    // Параметры из рубашки (sleeve)
    this.cntReset = sleeve?.discards || 1
    this.cntSteps = sleeve?.turns || 4
    this.defCntSteps = this.cntSteps
    this.enemyHealth = enemyData.health
    
    // Хранилище баффов Священника для предотвращения мухлежа
    this.priestBuffs = {} // { targetCardId: value }
    
    this.isAnimating = false
    this.isBlocked = false
    
    // Счётчик сыгранных карт за бой
    this.cardsPlayedThisBattle = 0
    
    // Инициализация статистики боя
    battleStats.reset()
    battleStats.setEnemy(enemyData.name, enemyData.health, enemyData.isBoss || false)
    battleStats.deckSize = deck.length
    
    // Постоянные баффы (от DiscardBuff и т.д.)
    // { faction: value, kind: value, id: value }
    this.permanentBuffs = {}

    // Регистрируем дебаффы (подписка на события)
    registerDebuffs(this)
  }

  // Применить постоянные баффы к карте
  applyPermanentBuffs(card) {
    const { faction, kind, type } = card.cardData

    // Проверяем по faction
    if (faction && this.permanentBuffs[faction]) {
      card.addPermanentBuff(this.permanentBuffs[faction])
    }
    // По kind
    if (kind && this.permanentBuffs[kind]) {
      card.addPermanentBuff(this.permanentBuffs[kind])
    }
    // По type (id)
    if (type && this.permanentBuffs[type]) {
      card.addPermanentBuff(this.permanentBuffs[type])
    }
  }

  setBlocked(blocked) {
    this.isBlocked = blocked
    
    // Используем battleUI для блокировки
    if (this.battleUI) {
      this.battleUI.setBlocked(blocked)
    }
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
      // Загружаем image_bg из стиля
      const style = getCardStyle(type.style)
      if (style && style.image_bg) urls.add(style.image_bg)
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
    
    // Сохраняем маппинг стилей для карт
    this.cardStylesMap = {}
    this.cardTypes.forEach(type => {
      if (type.image) this.assets[`card_${type.type}`] = { texture: PIXI.Assets.get(type.image) }
      // Получаем стиль для карты
      const style = getCardStyle(type.style)
      if (style && style.image_bg) {
        this.assets[`card_bg_${type.type}`] = { texture: PIXI.Assets.get(style.image_bg) }
        this.cardStylesMap[type.type] = style
      }
    })
    
    this.onAssetsLoaded()
  }

  onAssetsLoaded() {
    this.prepareDeck()
    this.render()
    this.handRenderer = new HandRenderer(this.app, this.cards, this.assets, this.cardTypes)
    this.cardAnimator = new CardAnimator(this.app, this.container)
    this.battleEffects = new BattleEffects(this.app, this.container, this.assets)
    this.app.stage.addChild(this.container)
    this.app.stage.sortChildren() // Пересортировать после добавления
    this.container.alpha = 0
    this.fadeIn()
    this.dealCards(8)
    this.emit('ready')
  }

  prepareDeck() {
    // this.deck уже массив объектов карт
    this.currentDeck = [...this.deck]
    
    log('[Battle.prepareDeck] this.deck length:', this.deck.length)
    log('[Battle.prepareDeck] this.currentDeck length:', this.currentDeck.length)
    log('[Battle.prepareDeck] first card:', this.currentDeck[0])
    
    // Если есть тестовые карты - берём их по порядку из getCards, остальные перемешиваем
    if (config.getCards && config.getCards.length > 0) {
      const testCards = []
      const restCards = [...this.currentDeck]
      
      // Берём карты по порядку из getCards
      for (const typeId of config.getCards) {
        const idx = restCards.findIndex(c => c.type === typeId)
        if (idx !== -1) {
          testCards.push(restCards.splice(idx, 1)[0])
        }
      }
      
      // Перемешиваем остальные
      restCards.sort(() => Math.random() - 0.5)
      
      // Тестовые первыми
      this.currentDeck = [...testCards, ...restCards]
    } else {
      this.currentDeck.sort(() => Math.random() - 0.5)
    }
  }

  dealCards(cnt) {
    const cardsToDeal = Math.min(cnt, this.currentDeck.length)
    
    for (let i = 0; i < cardsToDeal; i++) {
      setTimeout(() => {
        // Берём с начала (shift) чтобы тестовые карты были первыми
        const cardData = this.currentDeck.shift()
        if (cardData) {
          this.addCard(cardData)
          // После добавления всех карт - пересчитываем позиции
          if (i === cardsToDeal - 1) {
            setTimeout(() => {
              this.layoutCards()
              this.setBlocked(false)
            }, cardsToDeal * 100 + 300)
          }
          this.updateUI()
        }
      }, i * 100)
    }
  }

  addCard(cardData) {
    // Получаем стиль для карты
    const cardStyle = this.cardStylesMap[cardData.type] || getCardStyle(cardData.style)
    
    const card = new Card(cardData, {
      handIndex: this.cards.length,
      width: CARD_CONFIG.width,
      height: CARD_CONFIG.height,
      style: cardStyle
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

    // Применяем постоянные баффы (от DiscardBuff и т.д.)
    this.applyPermanentBuffs(card)
    
    // Позиция колоды (откуда вылетает карта) - по центру колоды
    const deckX = this.app.screen.width - CARD_CONFIG.width / 2 - 30
    const deckY = this.app.screen.height - CARD_CONFIG.height / 2 - 40
    
    // Начальная позиция - из колоды
    card.x = deckX
    card.y = deckY
    card.scale.set(0.1)
    
    // Добавляем в массив и рассчитываем позицию
    this.cards.push(card)
    
    // Обновляем HandRenderer с актуальным массивом карт
    this.handRenderer = new HandRenderer(this.app, this.cards, this.assets, this.cardTypes)
    this.layoutCards()
    
    // Небольшая задержка перед анимацией чтобы layoutCards отработал
    setTimeout(() => {
      if (this.cardAnimator) {
        this.cardAnimator.animateCardIn(card)
      }
    }, 10)
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
    // Проверяем что карта ещё имеет валидный контейнер
    if (!card || !card.parent) {
      if (onComplete) onComplete()
      return
    }
    
    const startX = card.x
    const startY = card.y
    const targetY = this.app.screen.height + 300
    
    let progress = 0
    const animate = () => {
      // Проверяем на каждом кадре
      if (!card || !card.parent) {
        if (onComplete) onComplete()
        return
      }
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
    if (this.handRenderer) {
      this.handRenderer.layoutCards()
    }
  }

  onCardClick(card) {
    if (this.isAnimating || this.isBlocked) return
    
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
    this.layoutCards()
    this.updateUI()
  }

  applyBuffs() {
    // Полностью очищаем все баффы
    this.cards.forEach(card => card.clearBuffs())

    // Сбрасываем заблокированые баффы
    this.cards.forEach(card => card.clearBlockedBuffs())

    // Сбрасываем дебаффы (ослабление)
    this.cards.forEach(card => card.clearDebuffs())

    // Сбрасываем флаг keepSteps
    this.keepStepsActive = false

    // === ЭТАП 1: Событие "beforeBuffs" — для дебаффов блокировки ===
    this.emit('beforeBuffs', this.selectedCards, this.cards, this)

    // === ЭТАП 2: Применяем баффы ===
    // Применяем баффы от всех карт в руке
    this.cards.forEach(card => {
      const cardType = this.cardTypes.find(t => t.type === card.cardData.type)
      if (cardType && cardType.buff) {
        // Проверяем, не заблокирован ли бафф этой карты
        if (card.isBuffBlocked(card.cardData.type)) {
          return // Пропускаем этот бафф
        }

        // Используем новую систему баффов
        const results = cardType.buff.apply(card, this.selectedCards, this.cards, this)
        
        // Применяем результаты баффа
        let notified = false
        results.forEach(({ card: targetCard, value, isSet }) => {
          targetCard.addBuff(card.id, card.cardData.type, value, isSet)
          
          // Уведомление о баффе (фиолетовое) - только для первой карты и если бафф хочет уведомить
          if (!notified && toastManager && cardType.buff.getNotificationMessage) {
            const message = cardType.buff.getNotificationMessage(card, value)
            if (message) {
              toastManager.show(message, 'purple')
              notified = true
            }
          }
        })
        
        // Проверяем специальные баффы (KeepSteps, ExactTypeAndDiscard)
        if (cardType.buff.checkCondition && cardType.buff.checkCondition(card, this.selectedCards, this.cards, this)) {
          if (cardType.buff.isSpecial && cardType.buff.isSpecial()) {
            const action = cardType.buff.getSpecialAction()
            if (action === 'keepSteps') {
              this.keepStepsActive = true
              // Помечаем все выбранные карты как баффнутые
              this.selectedCards.forEach(c => c.isBuffed = true)
              // Показываем уведомление о специальном баффе
              if (toastManager && cardType.buff.getNotificationMessage) {
                const message = cardType.buff.getNotificationMessage(card)
                if (message) {
                  toastManager.show(message, 'purple')
                }
              }
            }
            // discardFromDeck вызывается после хода, а не при выборе
          }
        }
      }
    })

    // Сохраняем баффы для сброса после хода
    this.pendingDiscards = []
    this.cards.forEach(card => {
      const cardType = this.cardTypes.find(t => t.type === card.cardData.type)
      if (cardType && cardType.buff && cardType.buff.checkCondition && 
          cardType.buff.checkCondition(card, this.selectedCards, this.cards, this)) {
        if (cardType.buff.isSpecial && cardType.buff.isSpecial()) {
          const action = cardType.buff.getSpecialAction()
          if (action === 'discardFromDeck') {
            this.pendingDiscards.push(cardType.buff)
          }
        }
      }
    })

    // === ЭТАП 3: Событие "afterBuffs" — для дебаффов ослабления ===
    this.emit('afterBuffs', this.selectedCards, this.cards, this)
  }

  applySkills() {
    // Если активен бафф KeepSteps - не тратим ход
    if (this.keepStepsActive) {
      log('Бафф KeepSteps активен - ход не тратится')
      this.keepStepsActive = false // Сбрасываем для следующего хода
      return true
    }
    
    // Вызываем getSkill из cardTypes для каждой выбранной карты
    this.selectedCards.forEach(selectedCard => {
      const cardType = this.cardTypes.find(t => t.type === selectedCard.cardData.type)
      if (cardType && cardType.getSkill) {
        cardType.getSkill(selectedCard, this)
      }
    })
    
    return false
  }

  playCards() {
    if (this.isAnimating || this.isBlocked || this.cntSteps <= 0 || this.selectedCards.length <= 0) {
      log(`[Battle.playCards] Отмена: isAnimating=${this.isAnimating}, isBlocked=${this.isBlocked}, cntSteps=${this.cntSteps}, selectedCards=${this.selectedCards.length}`)
      return
    }
    
    // Блокируем кнопки и ставим флаг АБСОЛЮТНО СРАЗУ
    this.isAnimating = true
    this.setBlocked(true)
    
    // Применяем скиллы перед ходом
    const skipStep = this.applySkills()
    
    let summ = 0
    this.selectedCards.forEach(card => {
      summ += card.getValue()
    })
    
    log(`[Battle.playCards] Ход ${battleStats.stepsPlayed + 1}: урон=${summ}, skipStep=${skipStep}`)
    
    // Всегда накапливаем урон (даже при KeepSteps)
    battleStats.damageDealt += summ
    
    this.enemyHealth -= summ
    if (!skipStep) {
      this.cntSteps--
      // Трекинг: засчитываем ход
      battleStats.stepsPlayed++
      battleStats.cardsPlayed += this.selectedCards.length
      log(`[Battle.playCards] После хода: damageDealt=${battleStats.damageDealt}, steps=${battleStats.stepsPlayed}`)
    } else {
      log(`[Battle.playCards] KeepSteps активен - ход не тратится, но урон засчитан: damageDealt=${battleStats.damageDealt}`)
      // Уведомление о пропуске хода
      if (toastManager) {
        toastManager.show('Пропуск хода!', 'purple')
      }
    }
    
    soundManager.play('attack')
    if (this.battleEffects) {
      this.battleEffects.showDamage(summ)
    }
    
    // Уведомление об уроне (зелёное)
    if (toastManager && summ > 0) {
      toastManager.show(t('battle.damage', { value: summ }), 'green')
    }
    
    setTimeout(() => {
      if (this.enemyHealth <= 0) {
        this.enemyHealth = 0
        this.showVictory()
      } else if (this.cntSteps <= 0) {
        this.showDefeat()
      } else {
        // Выполняем отложенный сброс карт из колоды (Берсерк и т.п.)
        if (this.pendingDiscards) {
          this.pendingDiscards.forEach(buff => {
            if (buff.discardFromDeck) {
              buff.discardFromDeck(this)
            }
          })
          this.pendingDiscards = []
        }
        this.resetSelectedCards()
      }
      this.isAnimating = false
    }, 1000)
  }

  resetSelectedCards() {
    // Очищаем баффы Священника после хода
    this.priestBuffs = {}
    
    const cardsToRemove = [...this.selectedCards]
    const discardedCount = cardsToRemove.length
    let removedCount = 0
    
    cardsToRemove.forEach((card, index) => {
      setTimeout(() => {
        if (this.cardAnimator) {
          this.cardAnimator.animateCardOut(card, () => {
            // Событие onDiscard — карта уходит из руки
            this.emit('onDiscard', card, this.cards, this)

            this.cards = this.cards.filter(c => c !== card)
            this.container.removeChild(card)
            removedCount++
            
            // Когда все карты улетели — добираем новые
            if (removedCount === cardsToRemove.length) {
              // Уведомление о сбросе карт (красное)
              if (toastManager && discardedCount > 0) {
                toastManager.show(t('battle.discarded', { count: discardedCount }), 'red')
              }
              
              const cardsNeeded = 8 - this.cards.length
              if (cardsNeeded > 0) {
                this.dealCards(cardsNeeded)
              }
              this.updateUI()
            }
          })
        }
      }, index * 100)
    })
    
    this.selectedCards = []
    this.activeCards = 0
  }

  resetCards() {
    if (this.cntReset <= 0 || this.selectedCards.length === 0 || this.isBlocked) return
    
    const discardedCount = this.selectedCards.length
    this.cntReset--
    // Трекинг: засчитываем сброс
    battleStats.cardsDiscarded += discardedCount
    this.priestBuffs = {}
    
    const cardsToRemove = [...this.selectedCards]
    let removedCount = 0
    
    cardsToRemove.forEach((card, index) => {
      setTimeout(() => {
        if (this.cardAnimator) {
          this.cardAnimator.animateCardOut(card, () => {
            // Событие onDiscard — карта уходит из руки
            this.emit('onDiscard', card, this.cards, this)

            this.cards = this.cards.filter(c => c !== card)
            this.container.removeChild(card)
            removedCount++
            
            if (removedCount === cardsToRemove.length) {
              // Уведомление о сбросе (красное)
              if (toastManager && discardedCount > 0) {
                toastManager.show(t('battle.discarded', { count: discardedCount }), 'red')
              }
              
              const cardsNeeded = 8 - this.cards.length
              if (cardsNeeded > 0) {
                this.dealCards(cardsNeeded)
              }
              this.updateUI()
            }
          })
        }
      }, index * 100)
    })
    
    this.selectedCards = []
    this.activeCards = 0
  }

  showDamage(amount) {
    // Анимация удара - красная вспышка
    const hitEffect = new PIXI.Graphics()
    hitEffect.beginFill(colors.ui.text.damage, 0.3)
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
    // Уведомление о победе (фиолетовое)
    if (toastManager) {
      toastManager.show(t('battle.victory'), 'purple')
    }
    
    // Обновляем UI перед показом модалки (чтобы счётчики были актуальны)
    if (this.battleUI) {
      this.battleUI.updateSteps(this.cntSteps)
      this.battleUI.updateResets(this.cntReset)
      this.battleUI.updateDeckCount(this.currentDeck.length)
    }
    
    // Устанавливаем остаток ходов для расчёта наград
    battleStats.setStepsLeft(this.cntSteps)
    
    // Сохраняем текущее HP врага ПЕРЕД обнулением (для статистики)
    const finalEnemyHealth = this.enemyHealth
    
    log(`[Battle.showVictory] finalEnemyHealth=${finalEnemyHealth}, damageDealt=${battleStats.damageDealt}, enemyMaxHealth=${battleStats.enemyMaxHealth}`)
    
    // Завершаем статистику боя
    const remainingCards = this.currentDeck?.length || 0
    battleStats.finish(true, remainingCards)
    const reward = battleStats.calculateReward(finalEnemyHealth, this.enemyData?.difficulty || 'medium')
    const breakdown = reward.breakdown
    
    // Модальное окно победы
    this.victoryModal = new Modal(this.app, {
      title: t('battle.victory'),
      width: 500,
      height: 550,
      showCloseButton: false,
      onClose: () => {}
    })
    
    // Эпическая фраза при победе
    const victoryPhrases = [
      'Слава герою!',
      'Победа за тобой!',
      'Враг повержен!',
      'Триумф!',
      'Честь и слава!',
      'Легенда рождается!',
      'Победа близка!',
      'Ты непобедим!'
    ]
    const randomPhrase = victoryPhrases[Math.floor(Math.random() * victoryPhrases.length)]
    
    const phraseText = new TextNode({
      text: randomPhrase,
      width: 400,
      height: 40,
      fontSize: 26,
      color: colors.ui.text.gold,
      align: 'center',
      shadow: true,
      app: this.app
    })
    phraseText.setX(0)
    phraseText.y = -200 // Опускаем ближе к заголовку (-260 + 60)
    this.victoryModal.addChild(phraseText)
    
    // Статистика боя
    const stats = battleStats.getData()
    const statsData = [
      { label: t('battle.stats.steps'), value: stats.stepsPlayed },
      { label: t('battle.stats.cards_played'), value: stats.cardsPlayed },
      { label: t('battle.stats.cards_discarded'), value: stats.cardsDiscarded },
      { label: t('battle.stats.damage_dealt'), value: stats.damageDealt },
      { label: t('battle.stats.enemy_hp'), value: stats.enemyMaxHealth - stats.enemyFinalHealth }
    ]
    
    // Награды с детализацией
    const rewardsData = [
      { label: 'Золото за победу', value: `+${breakdown.base}`, color: 'gold' },
      { label: `Оставшиеся ходы (${breakdown.steps / config.rewards.goldPerStep})`, value: `+${breakdown.steps}`, color: 'gold' },
      { label: 'Добивание (урон)', value: `+${breakdown.overflow}`, color: 'gold' },
      { label: 'Всего золота', value: `+${reward.gold}`, color: 'gold', bold: true },
      { label: 'Кристаллы', value: `+${reward.crystals}`, color: 'crystals', bold: reward.crystals > 0 }
    ]
    
    // Вычисляем ширину самого длинного label
    const tempText = new PIXI.Text('', { fontFamily: FONT, fontSize: 16 })
    let maxLabelWidth = 0
    statsData.forEach(item => {
      tempText.text = item.label
      if (tempText.width > maxLabelWidth) maxLabelWidth = tempText.width
    })
    rewardsData.forEach(item => {
      tempText.text = item.label
      if (tempText.width > maxLabelWidth) maxLabelWidth = tempText.width
    })
    
    const labelX = -140
    const valueX = 120
    const lineStart = labelX + maxLabelWidth + 10
    const lineEnd = valueX - 5
    let statsY = -160 // Сразу под фразой
    
    // Обычная статистика
    statsData.forEach((item, i) => {
      const label = item.label
      const value = String(item.value)
      const color = colors.ui.text.primary
      const y = statsY + i * 24
      
      // Label слева
      const labelText = new PIXI.Text(label, {
        fontFamily: FONT,
        fontSize: 16,
        fill: color
      })
      labelText.anchor.set(0, 0)
      labelText.x = labelX
      labelText.y = y
      this.victoryModal.addChild(labelText)
      
      // Пунктирная линия
      const graphics = new PIXI.Graphics()
      graphics.lineStyle(1, colors.ui.text.secondary, 0.5)
      const dashLength = 3
      const gapLength = 4
      let currentX = lineStart
      while (currentX < lineEnd) {
        graphics.moveTo(currentX, y + 14)
        graphics.lineTo(Math.min(currentX + dashLength, lineEnd), y + 14)
        currentX += dashLength + gapLength
      }
      this.victoryModal.addChild(graphics)
      
      // Value справа
      const valueText = new PIXI.Text(value, {
        fontFamily: FONT,
        fontSize: 16,
        fill: color
      })
      valueText.anchor.set(0, 0)
      valueText.x = valueX
      valueText.y = y
      this.victoryModal.addChild(valueText)
    })
    
    // Разделитель перед наградами
    const dividerY = statsY + statsData.length * 24 + 10
    const divider = new PIXI.Graphics()
    divider.lineStyle(2, colors.ui.text.secondary, 0.5)
    divider.moveTo(labelX - 10, dividerY)
    divider.lineTo(valueX + 50, dividerY)
    this.victoryModal.addChild(divider)
    
    // Награды
    const rewardsY = dividerY + 20
    rewardsData.forEach((item, i) => {
      const label = item.label
      const value = String(item.value)
      const color = item.color === 'gold' ? colors.ui.text.gold : (item.color === 'crystals' ? colors.ui.text.crystals : colors.ui.text.primary)
      const y = rewardsY + i * 24
      const fontSize = item.bold ? 18 : 16
      const fontWeight = item.bold ? 'bold' : 'normal'
      
      // Label слева
      const labelText = new PIXI.Text(label, {
        fontFamily: FONT,
        fontSize: fontSize,
        fontWeight: fontWeight,
        fill: color
      })
      labelText.anchor.set(0, 0)
      labelText.x = labelX
      labelText.y = y
      this.victoryModal.addChild(labelText)
      
      // Пунктирная линия
      const graphics = new PIXI.Graphics()
      graphics.lineStyle(1, colors.ui.text.secondary, 0.5)
      const dashLength = 3
      const gapLength = 4
      let currentX = lineStart
      while (currentX < lineEnd) {
        graphics.moveTo(currentX, y + (fontSize === 18 ? 16 : 14))
        graphics.lineTo(Math.min(currentX + dashLength, lineEnd), y + (fontSize === 18 ? 16 : 14))
        currentX += dashLength + gapLength
      }
      this.victoryModal.addChild(graphics)
      
      // Value справа
      const valueText = new PIXI.Text(value, {
        fontFamily: FONT,
        fontSize: fontSize,
        fontWeight: fontWeight,
        fill: color
      })
      valueText.anchor.set(0, 0)
      valueText.x = valueX
      valueText.y = y
      this.victoryModal.addChild(valueText)
    })
    
    // Кнопка продолжения
    const continueBtn = new Button(t('battle.continue'), {
      width: 200,
      height: 60,
      fontSize: 24,
      color: colors.ui.button.play,
      app: this.app
    })
    continueBtn.setX(0) // Центр окна
    continueBtn.setY(180) // Поднята к центру модалки
    continueBtn.onClick = () => {
      this.victoryModal.hide()
      this.app.stage.removeChild(this.victoryModal.container)
      this.emit('victory')
      this.emit('end')
    }
    this.victoryModal.addChild(continueBtn)
    
    this.victoryModal.addToStage(this.app.stage)
    this.victoryModal.show()
    
    soundManager.play('battleVictory')
  }

  showDefeat() {
    // Уведомление о поражении (красное)
    if (toastManager) {
      toastManager.show(t('battle.defeat'), 'red')
    }
    
    // Сохраняем текущее HP врага ПЕРЕД расчётом (для статистики)
    const finalEnemyHealth = this.enemyHealth
    
    // Завершаем статистику боя
    const remainingCards = this.currentDeck?.length || 0
    battleStats.finish(false, remainingCards)
    battleStats.calculateReward(finalEnemyHealth)
    
    // Модальное окно поражения
    this.defeatModal = new Modal(this.app, {
      title: t('battle.defeat'),
      width: 500,
      height: 450, // Уменьшена высота (нет наград)
      showCloseButton: false,
      onClose: () => {}
    })
    
    // Текст (создаём как PIXI.Text для возможности смены текста)
    let msgText = new PIXI.Text('', {
      fontFamily: FONT,
      fontSize: 22,
      fill: colors.ui.text.defeat,
      align: 'center'
    })
    msgText.anchor.set(0.5, 0)
    msgText.x = 0
    msgText.y = -160 // Поднято ближе к заголовку
    this.defeatModal.addChild(msgText)
    
    // Статистика боя - форматированный список
    const stats = battleStats.getData()
    const statsData = [
      { label: t('battle.stats.steps'), value: stats.stepsPlayed },
      { label: t('battle.stats.cards_played'), value: stats.cardsPlayed },
      { label: t('battle.stats.cards_discarded'), value: stats.cardsDiscarded },
      { label: t('battle.stats.damage_dealt'), value: stats.damageDealt },
      { label: t('battle.stats.enemy_hp'), value: stats.enemyMaxHealth - stats.enemyFinalHealth }
    ]
    
    // Эпические фразы при поражении
    const defeatPhrases = [
      'Судьба ещё повернётся к тебе лицом...',
      'Каждый мастер когда-то был новичком...',
      'Герои учатся на поражениях...',
      'В следующий раз удача будет на твоей стороне...',
      'Твой дух всё ещё силён...',
      'Новая попытка — новый триумф...',
      'Поражение — не конец, а начало пути...',
      'Верь в себя, и ты победишь...'
    ]
    const randomDefeatPhrase = defeatPhrases[Math.floor(Math.random() * defeatPhrases.length)]
    msgText.text = randomDefeatPhrase
    
    // Вычисляем ширину самого длинного label
    const tempText = new PIXI.Text('', { fontFamily: FONT, fontSize: 16 })
    let maxLabelWidth = 0
    statsData.forEach(item => {
      tempText.text = item.label
      if (tempText.width > maxLabelWidth) maxLabelWidth = tempText.width
    })
    
    const labelX = -140
    const valueX = 120
    const lineStart = labelX + maxLabelWidth + 10
    const lineEnd = valueX - 5
    let statsY = -120 // Поднято выше (было -80)
    
    statsData.forEach((item, i) => {
      const label = item.label
      const value = String(item.value)
      const y = statsY + i * 24
      
      // Label слева
      const labelText = new PIXI.Text(label, {
        fontFamily: FONT,
        fontSize: 16,
        fill: colors.ui.text.primary
      })
      labelText.anchor.set(0, 0)
      labelText.x = labelX
      labelText.y = y
      this.defeatModal.addChild(labelText)
      
      // Пунктирная линия (dotted) по нижнему краю текста
      const graphics = new PIXI.Graphics()
      graphics.lineStyle(1, colors.ui.text.secondary, 0.5)
      const dashLength = 3
      const gapLength = 4
      let currentX = lineStart
      while (currentX < lineEnd) {
        graphics.moveTo(currentX, y + 14)
        graphics.lineTo(Math.min(currentX + dashLength, lineEnd), y + 14)
        currentX += dashLength + gapLength
      }
      this.defeatModal.addChild(graphics)
      
      // Value справа
      const valueText = new PIXI.Text(value, {
        fontFamily: FONT,
        fontSize: 16,
        fill: colors.ui.text.primary
      })
      valueText.anchor.set(0, 0)
      valueText.x = valueX
      valueText.y = y
      this.defeatModal.addChild(valueText)
    })
    
    // Кнопка продолжения
    const continueBtn = new Button(t('battle.to_base'), {
      width: 200,
      height: 60,
      fontSize: 24,
      color: colors.ui.button.reset,
      app: this.app
    })
    continueBtn.setX(0) // Центр окна
    continueBtn.setY(140) // Поднята ближе к статистике
    continueBtn.onClick = () => {
      this.defeatModal.hide()
      this.app.stage.removeChild(this.defeatModal.container)
      this.emit('defeat')
    }
    this.defeatModal.addChild(continueBtn)
    
    this.defeatModal.addToStage(this.app.stage)
    this.defeatModal.show()
    
    soundManager.play('battleFail')
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
      bg.beginFill(colors.background.battle)
      bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
      bg.endFill()
      this.container.addChild(bg)
    }
    
    this.renderEnemy()
    this.battleUI = new BattleUI(this.app, this.container, this.assets)
    this.battleUI.render(
      this.cntSteps,
      this.cntReset,
      this.currentDeck.length,
      () => this.playCards(),
      () => this.resetCards(),
      () => this.showDeckMenu()
    )
  }

  renderEnemy() {
    // Используем EnemyDisplay (UINode) — в бою передаём isBattle = true для анимации
    this.enemyDisplay = new EnemyDisplay(this.app, this.enemyData, this.assets, true)
    this.enemyDisplay.setX(this.app.screen.width / 2)
    this.enemyDisplay.setY(280)
    this.enemyDisplay.zIndex = 1000
    this.container.sortableChildren = true // Включаем сортировку для zIndex
    this.container.addChild(this.enemyDisplay)
    this.updateEnemyHealthDisplay()
  }

  updateEnemyHealthDisplay() {
    if (this.enemyDisplay) {
      this.enemyDisplay.updateHealth(this.enemyHealth)
    }
    if (this.enemyHealthText) {
      this.enemyHealthText.text = `${this.enemyHealth}`
    }
  }

  renderControls() {
    const btnY = this.app.screen.height - 60
    
    // Кнопка "Ход"
    this.playBtn = this.createButton('Сделать ход!', colors.ui.button.play, () => this.playCards())
    this.playBtn.setX(this.app.screen.width / 2 - 100)
    this.playBtn.setY(btnY)
    this.container.addChild(this.playBtn)
    
    // Кнопка "Сброс"
    this.resetBtn = this.createButton('Сброс', colors.ui.button.reset, () => this.resetCards())
    this.resetBtn.setX(this.app.screen.width / 2 + 100)
    this.resetBtn.setY(btnY)
    this.container.addChild(this.resetBtn)
    
    // Счетчики
    const infoStyle = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 20,
      fill: colors.ui.text.primary
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

  showDeckMenu() {
    // Создаём модальное окно
    const modal = new Modal(this.app, {
      title: t('castle.deck'),
      width: 750,
      height: 500,
      bgColor: colors.ui.panel.bg
    })
    
    // Подсчёт количества каждого типа карты, которые ОСТАЛИСЬ В КОЛОДЕ
    const cardCounts = {}
    
    // Считаем карты в текущей колоде (оставшиеся, не разданные)
    this.currentDeck.forEach(card => {
      const type = card.type
      cardCounts[type] = (cardCounts[type] || 0) + 1
    })
    
    // Получаем ВСЕ типы карт из ИСХОДНОЙ колоды (this.deck)
    const deckCardTypes = [...new Set(this.deck.map(card => String(card.type)))]
    
    log('[Battle] showDeckMenu: deckCardTypes:', deckCardTypes)
    log('[Battle] showDeckMenu: this.cardTypes.length:', this.cardTypes.length)
    
    // Формируем массив только для типов карт, которые есть в исходной колоде
    const cardDataList = this.cardTypes
      .filter(cardType => {
        const matches = deckCardTypes.includes(String(cardType.type))
        if (!matches) {
          log('[Battle] showDeckMenu: Filtering out:', cardType.type)
        }
        return matches
      })
      .map(cardType => ({
        type: cardType.type,
        count: cardCounts[cardType.type] || 0,
        ...cardType
      }))
      .sort((a, b) => (b.value || 0) - (a.value || 0))
    
    log('[Battle] showDeckMenu: cardDataList.length:', cardDataList.length)
    
    // Статистика
    const statsText = new PIXI.Text(
      `${t('battle.cards_left')}: ${this.currentDeck.length} | ${t('battle.in_hand')}: ${this.cards.length}`,
      { fontFamily: FONT, fontSize: 16, fill: colors.ui.text.secondary }
    )
    statsText.anchor.set(0.5, 0)
    statsText.y = -180
    
    // Рендерим через CardGridRenderer
    modal.setContent((content) => {
      content.addChild(statsText)
      
      const gridRenderer = new CardGridRenderer(this.app, cardDataList, this.assets, {
        columns: 6,
        cardScale: 0.55,
        gap: 8,
        showCount: true,
        grayscaleZero: true,
        sortBy: 'value',
        sortDesc: true,
        cardTypes: this.cardTypes
      })
      gridRenderer.render(content)
      
      // Запускаем ticker для скролла
      this._deckGridTicker = () => gridRenderer.update()
      this.app.ticker.add(this._deckGridTicker)
    })
    
    modal.onClose = () => {
      if (this._deckGridTicker) {
        this.app.ticker.remove(this._deckGridTicker)
        this._deckGridTicker = null
      }
    }
    
    modal.addToStage(this.app.stage)
    modal.show()
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
    this.updateEnemyHealthDisplay()
    if (this.battleUI) {
      this.battleUI.updateSteps(this.cntSteps)
      this.battleUI.updateResets(this.cntReset)
      this.battleUI.updateDeckCount(this.currentDeck.length)
    }
    
    this.selectedCards.forEach(card => card.updateValue())
    
    // Обновить силу атаки
    if (this.enemyDisplay) {
      const attackPower = this.selectedCards.reduce((sum, card) => sum + card.getValue(), 0)
      this.enemyDisplay.showAttack(attackPower)
    }
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
    this._tickerCallback = () => this.gameLoop()
    this.app.ticker.add(this._tickerCallback)
  }

  gameLoop() {
    // Используем HandRenderer для обновления карт
    if (this.handRenderer) {
      this.handRenderer.update()
    }
    
    // Используем BattleUI для анимации колоды
    if (this.battleUI) {
      this.battleUI.update()
    }
  }

  fadeOut(callback) {
    // Останавливаем тикер
    if (this._tickerCallback) {
      this.app.ticker.remove(this._tickerCallback)
      this._tickerCallback = null
    }
    
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
    // Удаляем все children с вызовом destroy() (чтобы остановить tickers)
    const children = this.container.children.slice()
    children.forEach(child => {
      if (child.destroy) {
        child.destroy({ children: true })
      } else {
        this.container.removeChild(child)
      }
    })
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
    // Не пересоздаём весь UI - только пересчитываем позиции
    this.layoutCards()
  }
}