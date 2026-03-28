// Глобальный конфиг игры
// Изменяется в коде или через local_config.json (который грузится в рантайме)

// Приватный объект с значениями
const _config = {
  debug: false,  // Включить логи и debug рамки
  enemiesCount: 10,
  getCards: [],   // Карты для тестирования (будут в начале колоды)
  lang: 'ru'      // Язык (ru, en, ...)
}

// Публичный API
export const config = {
  get debug() { return _config.debug },
  set debug(v) { _config.debug = v },
  get enemiesCount() { return _config.enemiesCount },
  set enemiesCount(v) { _config.enemiesCount = v },
  get getCards() { return _config.getCards },
  set getCards(v) { _config.getCards = v },
  get lang() { return _config.lang },
  set lang(v) { _config.lang = v }
}

// Логирование только в debug режиме
export function log(...args) {
  if (_config.debug) {
    console.log(...args)
  }
}

// Загрузка local_config.json (вызывать после старта игры)
export async function loadConfig() {
  _config.debug = false // Дефолт
  _config.enemiesCount = 10
  _config.getCards = []
  _config.lang = 'ru'

  const paths = ['local_config.json', '/local_config.json']

  for (const path of paths) {
    try {
      const res = await fetch(path + '?v=' + Date.now())
      if (res.ok) {
        const localConfig = await res.json()
        if (localConfig.debug !== undefined) _config.debug = localConfig.debug
        if (localConfig.enemiesCount !== undefined) _config.enemiesCount = localConfig.enemiesCount
        if (localConfig.getCards !== undefined) _config.getCards = localConfig.getCards
        if (localConfig.lang !== undefined) _config.lang = localConfig.lang
        console.log('[Config] Loaded:', localConfig)
        console.log('[Config] getCards:', _config.getCards)
        break
      }
    } catch (e) { /* ignore */ }
  }
}