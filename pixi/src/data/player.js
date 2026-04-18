import { decks } from './deck.js'
import { log } from './config.js'

const STORAGE_KEY = 'card_game_player'

const DEFAULT_PLAYER = {
  deckCode: 1,
  gold: 0,
  crystals: 0,
  name: 'Игрок',
  wins: 0,
  maps: 0, // Количество пройденных порталов (карт с врагами)
  baseLevel: 1,
  lang: 'RU', // Язык: RU, EN и т.д.
  cards: [], // ID карт в коллекции
  lastDailyReward: 0 // Timestamp последней ежедневной награды
}

// Получить все уникальные ID карт из колоды
function getUniqueCardIds(deckCards) {
  return [...new Set(deckCards)]
}

export class Player {
  constructor() {
    this.data = { ...DEFAULT_PLAYER }
    this.load()
    this.initCollection()
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        this.data = { ...DEFAULT_PLAYER, ...JSON.parse(saved) }
      }
    } catch (e) {
      console.warn('Failed to load player data:', e)
    }
  }

  // Инициализация коллекции карт при первом запуске
  initCollection() {
    // Если карт нет - выдаём стартовую колоду
    if (!this.data.cards || this.data.cards.length === 0) {
      const starterDeck = decks[1]
      if (starterDeck) {
        this.data.cards = getUniqueCardIds(starterDeck.cards)
        this.save()
        log('Выданы стартовые карты:', this.data.cards)
      }
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
    } catch (e) {
      console.warn('Failed to save player data:', e)
    }
  }

  reset() {
    this.data = { ...DEFAULT_PLAYER }
    this.save()
  }

  // Getters
  get deckCode() { return this.data.deckCode }
  get gold() { return this.data.gold }
  get crystals() { return this.data.crystals }
  get name() { return this.data.name }
  get wins() { return this.data.wins }
  get maps() { return this.data.maps }
  get baseLevel() { return this.data.baseLevel }
  get lang() { return this.data.lang }
  get cards() { return this.data.cards }
  get lastDailyReward() { return this.data.lastDailyReward || 0 }

  // Setters
  setDeckCode(code) {
    this.data.deckCode = code
    this.save()
  }

  addGold(amount) {
    this.data.gold += amount
    this.save()
  }

  setGold(amount) {
    this.data.gold = amount
    this.save()
  }

  addCrystals(amount) {
    this.data.crystals += amount
    this.save()
  }

  setCrystals(amount) {
    this.data.crystals = amount
    this.save()
  }

  addWin() {
    this.data.wins += 1
    this.save()
  }

  addMap(count = 1) {
    this.data.maps += count
    this.save()
  }

  setLang(lang) {
    this.data.lang = lang
    this.save()
  }

  // Добавить карты в коллекцию
  addCardsToCollection(cardIds) {
    if (!this.data.cards) this.data.cards = []
    this.data.cards.push(...cardIds)
    this.save()
  }

  // Проверить, есть ли карта в коллекции
  hasCard(cardId) {
    return this.data.cards && this.data.cards.includes(cardId)
  }

  // Получить ежедневную награду (возвращает { received: bool, reward: { gold, crystals } })
  claimDailyReward(config) {
    const now = Date.now()
    const lastClaim = this.lastDailyReward
    
    // Проверяем, прошло ли 24 часа (24 * 60 * 60 * 1000 = 86400000 мс)
    const DAY_MS = 24 * 60 * 60 * 1000
    
    if (now - lastClaim < DAY_MS) {
      return { received: false, reward: null }
    }
    
    // Начисляем награду
    const reward = {
      gold: config.dailyReward.gold,
      crystals: config.dailyReward.crystals
    }
    
    this.data.gold += reward.gold
    this.data.crystals += reward.crystals
    this.data.lastDailyReward = now
    this.save()
    
    return { received: true, reward }
  }
}

export const player = new Player()
