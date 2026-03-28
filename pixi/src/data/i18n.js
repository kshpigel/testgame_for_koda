import { config, log } from './config.js'

const _translations = {}
let _currentLang = 'ru'

// Загрузить переводы
export async function loadTranslations(lang = 'ru') {
  _currentLang = lang
  
  try {
    const response = await fetch(`/assets/lang/${lang}.json`)
    if (response.ok) {
      _translations[lang] = await response.json()
      log(`[i18n] Loaded language: ${lang}`)
    } else {
      console.warn(`[i18n] Language file not found: ${lang}, falling back to ru`)
      if (lang !== 'ru') {
        return loadTranslations('ru')
      }
    }
  } catch (e) {
    console.warn(`[i18n] Failed to load ${lang}:`, e)
  }
}

// Получить перевод по ключу (поддержка вложенных ключей через точку)
// Пример: t('ui.save') -> "СОХРАНИТЬ"
// Пример: t('validation.need_min_cards', { min: 16, current: 8 }) -> "Нужно минимум 16 карт (сейчас 8)"
export function t(key, params = {}) {
  const keys = key.split('.')
  let value = _translations[_currentLang]
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k]
    } else {
      value = undefined
      break
    }
  }
  
  // Fallback на русский
  if (value === undefined && _currentLang !== 'ru') {
    value = _translations['ru']
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        value = undefined
        break
      }
    }
  }
  
  // Fallback на ключ
  if (value === undefined) {
    return key
  }
  
  // Замена параметров {param}
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    for (const [param, val] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), val)
    }
  }
  
  return value
}

// Текущий язык
export function getLang() {
  return _currentLang
}

// Установить язык
export function setLang(lang) {
  _currentLang = lang
}