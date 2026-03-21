// Глобальный конфиг игры (дефолтные значения)
// Переопределяется значениями из local_config.json при старте

const DEFAULT_CONFIG = {
  debug: true,
  // Количество врагов на карте (для тестирования)
  enemiesCount: 10
}

export let config = { ...DEFAULT_CONFIG }

// Загрузка local_config.json и слияние с дефолтным конфигом
export async function loadConfig() {
  // Сначала применяем дефолты
  Object.assign(config, DEFAULT_CONFIG)
  
  try {
    // Пробуем разные пути
    let localConfig = null
    try {
      const res = await fetch('local_config.json')
      if (res.ok) localConfig = await res.json()
    } catch (e) { /* ignore */ }
    
    if (!localConfig) {
      try {
        const res = await fetch('/local_config.json')
        if (res.ok) localConfig = await res.json()
      } catch (e) { /* ignore */ }
    }
    
    if (!localConfig) {
      throw new Error('local_config.json not found')
    }
    
    // Мутируем существующий объект (чтобы импорты видели изменения)
    Object.assign(config, localConfig)
    console.log('[Config] Loaded:', config)
  } catch (e) {
    console.log('[Config] Using defaults:', config)
  }
}
