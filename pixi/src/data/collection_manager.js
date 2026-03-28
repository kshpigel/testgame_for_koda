import { log } from './config.js'
import { card_types } from './card_types/index.js'
import collectionData from '../../public/assets/data/collection.json'
import sleevesData from '../../public/assets/data/deck_sleeves.json'

const STORAGE_KEY = 'card_game_collection'

// Дефолтные данные коллекции (из collection.json)
const DEFAULT_COLLECTION = collectionData

// Дефолтные данные рубашек (из deck_sleeves.json)
const DEFAULT_SLEEVES = sleevesData

export class CollectionManager {
  constructor() {
    this.data = { ...DEFAULT_COLLECTION }
    this.sleevesData = { ...DEFAULT_SLEEVES }
    this.load()
    
    // Если коллекция пустая - инициализируем дефолтом
    if (Object.keys(this.data.cards).length === 0) {
      log('[CollectionManager] Empty collection, initializing with defaults')
      this.data = { ...DEFAULT_COLLECTION }
      this.save()
    }
    
    // Если рубашек нет - инициализируем дефолтом
    if (!this.sleevesData.sleeves || Object.keys(this.sleevesData.sleeves).length === 0) {
      log('[CollectionManager] Empty sleeves, initializing with defaults')
      this.sleevesData = { ...DEFAULT_SLEEVES }
      this.saveSleeves()
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
    
    // Загружаем рубашки
    this.loadSleeves()
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

  // ========== РУБАШКИ (SLEEVES) ==========

  // Загрузить рубашки из localStorage
  loadSleeves() {
    try {
      const saved = localStorage.getItem('card_game_sleeves')
      if (saved) {
        this.sleevesData = { ...DEFAULT_SLEEVES, ...JSON.parse(saved) }
      }
      log('[CollectionManager] sleeves loaded:', this.sleevesData)
    } catch (e) {
      console.warn('[CollectionManager] Failed to load sleeves:', e)
    }
  }

  // Сохранить рубашки в localStorage
  saveSleeves() {
    try {
      localStorage.setItem('card_game_sleeves', JSON.stringify(this.sleevesData))
      log('[CollectionManager] sleeves saved')
    } catch (e) {
      console.warn('[CollectionManager] Failed to save sleeves:', e)
    }
  }

  // Получить все рубашки
  getAllSleeves() {
    return { ...this.sleevesData.sleeves }
  }

  // Получить рубашку по ID
  getSleeve(id) {
    return this.sleevesData.sleeves[id] || null
  }

  // Получить активную рубашку
  getActiveSleeve() {
    return this.getSleeve(this.sleevesData.activeSleeve)
  }

  // Получить ID активной рубашки
  getActiveSleeveId() {
    return this.sleevesData.activeSleeve
  }

  // Установить активную рубашку
  setActiveSleeve(id) {
    if (this.sleevesData.sleeves[id]) {
      this.sleevesData.activeSleeve = id
      this.saveSleeves()
      log(`[CollectionManager] Active sleeve set to ${id}`)
      return true
    }
    return false
  }

  // Рассчитать minCards для рубашки
  getMinCards(sleeveId) {
    const sleeve = this.getSleeve(sleeveId)
    if (!sleeve) return 0
    const handSize = 8
    return Math.floor((sleeve.turns + sleeve.discards / 2) * handSize)
  }

  // Проверить, есть ли рубашка в коллекции
  hasSleeve(id) {
    return !!this.sleevesData.sleeves[id]
  }

  // Добавить рубашку в коллекцию
  addSleeve(sleeveData) {
    const id = sleeveData.id
    if (!id) {
      log('[CollectionManager] Cannot add sleeve - no ID')
      return false
    }
    this.sleevesData.sleeves[id] = sleeveData
    this.saveSleeves()
    log(`[CollectionManager] Added sleeve ${id}`)
    return true
  }

  // Сбросить рубашки к дефолту
  resetSleeves() {
    this.sleevesData = { ...DEFAULT_SLEEVES }
    this.saveSleeves()
  }
}

export const collectionManager = new CollectionManager()
