import { log } from './config.js'
import { card_types } from './card_types/index.js'
import collectionData from '../../public/assets/data/collection.json'

const STORAGE_KEY = 'card_game_collection'

// Дефолтные данные коллекции (из collection.json)
const DEFAULT_COLLECTION = collectionData

export class CollectionManager {
  constructor() {
    this.data = { ...DEFAULT_COLLECTION }
    this.load()
    
    // Если коллекция пустая - инициализируем дефолтом
    if (Object.keys(this.data.cards).length === 0) {
      log('[CollectionManager] Empty collection, initializing with defaults')
      this.data = { ...DEFAULT_COLLECTION }
      this.save()
    }
  }

  // Загрузить из localStorage
  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        this.data = { ...DEFAULT_COLLECTION, ...JSON.parse(saved) }
      }
      log('[CollectionManager] loaded:', this.data)
    } catch (e) {
      console.warn('[CollectionManager] Failed to load:', e)
    }
  }

  // Сохранить в localStorage
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
      log('[CollectionManager] saved')
    } catch (e) {
      console.warn('[CollectionManager] Failed to save:', e)
    }
  }

  // Получить количество карт определённого типа
  getCount(type) {
    return this.data.cards[type] || 0
  }

  // Получить общее количество карт в коллекции
  getTotal() {
    return Object.values(this.data.cards).reduce((sum, count) => sum + count, 0)
  }

  // Получить лимит карт
  getMax() {
    return this.data.maxCards
  }

  // Проверить, можем ли добавить карты (не превысим лимит)
  canAdd(count = 1) {
    return this.getTotal() + count <= this.data.maxCards
  }

  // Добавить карты в коллекцию
  addCard(type, count = 1) {
    if (!this.canAdd(count)) {
      log('[CollectionManager] Cannot add cards - limit reached')
      return false
    }
    
    if (!this.data.cards[type]) {
      this.data.cards[type] = 0
    }
    this.data.cards[type] += count
    this.save()
    log(`[CollectionManager] Added ${count} of type ${type}, total: ${this.data.cards[type]}`)
    return true
  }

  // Удалить карты из коллекции
  removeCard(type, count = 1) {
    if (!this.data.cards[type] || this.data.cards[type] < count) {
      log('[CollectionManager] Cannot remove cards - not enough')
      return false
    }
    
    this.data.cards[type] -= count
    if (this.data.cards[type] <= 0) {
      delete this.data.cards[type]
    }
    this.save()
    log(`[CollectionManager] Removed ${count} of type ${type}`)
    return true
  }

  // Получить все карты коллекции
  getAllCards() {
    return { ...this.data.cards }
  }

  // Сбросить коллекцию к дефолту
  reset() {
    this.data = { ...DEFAULT_COLLECTION }
    this.save()
  }
}

export const collectionManager = new CollectionManager()
