import { log } from './config.js'
import { collectionManager } from './collection_manager.js'
import decksData from '../../public/assets/data/decks.json'

const STORAGE_KEY = 'card_game_decks'

// Дефолтные данные колод (из decks.json)
const DEFAULT_DECKS = decksData

export class DeckManager {
  constructor() {
    this.data = { ...DEFAULT_DECKS }
    this.load()
    
    // Если колод нет - инициализируем дефолтом
    if (!this.data.decks || Object.keys(this.data.decks).length === 0) {
      log('[DeckManager] Empty decks, initializing with defaults')
      this.data = { ...DEFAULT_DECKS }
      this.save()
    }
  }

  // Загрузить из localStorage
  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        this.data = { ...DEFAULT_DECKS, ...JSON.parse(saved) }
      }
      log('[DeckManager] loaded:', this.data)
    } catch (e) {
      console.warn('[DeckManager] Failed to load:', e)
    }
  }

  // Сохранить в localStorage
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
      log('[DeckManager] saved')
    } catch (e) {
      console.warn('[DeckManager] Failed to save:', e)
    }
  }

  // Получить колоду по ID
  getDeck(id) {
    return this.data.decks[id] || null
  }

  // Получить активную колоду
  getActiveDeck() {
    return this.getDeck(this.data.activeDeck)
  }

  // Получить ID активной колоды
  getActiveDeckId() {
    return this.data.activeDeck
  }

  // Установить активную колоду
  setActiveDeck(id) {
    if (this.data.decks[id]) {
      this.data.activeDeck = id
      this.save()
      log(`[DeckManager] Active deck set to ${id}`)
      return true
    }
    return false
  }

  // Получить все колоды
  getAllDecks() {
    return { ...this.data.decks }
  }

  // Получить количество карт в колоде
  getDeckSize(id) {
    const deck = this.getDeck(id)
    return deck ? deck.cards.length : 0
  }

  // Проверить, достаточно ли карт в коллекции для колоды
  validateDeck(id, cardTypes = []) {
    const deck = this.getDeck(id)
    if (!deck) return { valid: false, reason: 'Deck not found' }

    const cardCounts = {}
    
    // Считаем сколько нужно каждого типа карты
    for (const type of deck.cards) {
      cardCounts[type] = (cardCounts[type] || 0) + 1
    }

    // Проверяем есть ли все карты в коллекции
    for (const [type, needCount] of Object.entries(cardCounts)) {
      const haveCount = collectionManager.getCount(parseInt(type))
      if (haveCount < needCount) {
        const cardType = cardTypes.find(c => c.type === parseInt(type))
        const cardName = cardType ? cardType.name : `type ${type}`
        return {
          valid: false,
          reason: `Not enough ${cardName}: need ${needCount}, have ${haveCount}`
        }
      }
    }

    return { valid: true }
  }

  // Добавить карту в колоду
  addCardToDeck(deckId, type) {
    const deck = this.getDeck(deckId)
    if (!deck) {
      log('[DeckManager] Deck not found:', deckId)
      return false
    }

    // Проверяем есть ли карта в коллекции
    const haveCount = collectionManager.getCount(type)
    const inDeckCount = deck.cards.filter(c => c === type).length
    
    if (inDeckCount >= haveCount) {
      log('[DeckManager] Cannot add card - not enough in collection')
      return false
    }

    deck.cards.push(type)
    this.save()
    log(`[DeckManager] Added card ${type} to deck ${deckId}`)
    return true
  }

  // Удалить карту из колоды
  removeCardFromDeck(deckId, type) {
    const deck = this.getDeck(deckId)
    if (!deck) {
      log('[DeckManager] Deck not found:', deckId)
      return false
    }

    const idx = deck.cards.indexOf(type)
    if (idx === -1) {
      log('[DeckManager] Card not found in deck')
      return false
    }

    deck.cards.splice(idx, 1)
    this.save()
    log(`[DeckManager] Removed card ${type} from deck ${deckId}`)
    return true
  }

  // Сбросить колоды к дефолту
  reset() {
    this.data = { ...DEFAULT_DECKS }
    this.save()
  }
}

export const deckManager = new DeckManager()
