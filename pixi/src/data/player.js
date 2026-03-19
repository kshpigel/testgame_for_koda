import { decks } from './deck.js'

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
  cards: [] // ID карт в коллекции
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
        console.log('Выданы стартовые карты:', this.data.cards)
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

  // Setters
  setDeckCode(code) {
    this.data.deckCode = code
    this.save()
  }

  addGold(amount) {
    this.data.gold += amount
    this.save()
  }

  addCrystals(amount) {
    this.data.crystals += amount
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
}

export const player = new Player()
