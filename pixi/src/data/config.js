// Глобальный конфиг игры
// Изменяется в коде или через local_config.json (который грузится в рантайме)

// Приватный объект с значениями
const _config = {
  debug: false,  // Включить логи и debug рамки
  enemiesCount: 10,
  mapNodes: 10,  // Количество узлов на карте
  getCards: [],   // Карты для тестирования (будут в начале колоды)
  lang: 'ru',      // Язык (ru, en, ...)
  
  // Настройки сложности врагов
  enemyDifficultyBase: 0.5,  // Начальный множитель силы
  enemyDifficultyMax: 1.5,   // Конечный множитель силы (босс)
  
  // Стоимость входа в портал
  portalCost: 200,
  // Стоимость активации премиум портала
  premiumPortalActivationCost: 200,
  
  // Настройки сложности врагов
  rewards: {
    baseGold: 25,       // Базовая награда за победу
    goldPerStep: 10,    // Золото за каждый оставшийся ход
    bossCrystals: 5     // Кристаллы за победу над боссом
  }
}

// Публичный API
export const config = {
  get debug() { return _config.debug },
  set debug(v) { _config.debug = v },
  get enemiesCount() { return _config.enemiesCount },
  set enemiesCount(v) { _config.enemiesCount = v },
  get mapNodes() { return _config.mapNodes },
  set mapNodes(v) { _config.mapNodes = v },
  get enemyDifficultyBase() { return _config.enemyDifficultyBase },
  set enemyDifficultyBase(v) { _config.enemyDifficultyBase = v },
  get enemyDifficultyMax() { return _config.enemyDifficultyMax },
  set enemyDifficultyMax(v) { _config.enemyDifficultyMax = v },
  get portalCost() { return _config.portalCost },
  set portalCost(v) { _config.portalCost = v },
  get premiumPortalActivationCost() { return _config.premiumPortalActivationCost },
  set premiumPortalActivationCost(v) { _config.premiumPortalActivationCost = v },
  get getCards() { return _config.getCards },
  set getCards(v) { _config.getCards = v },
  get lang() { return _config.lang },
  set lang(v) { _config.lang = v },
  get rewards() { return _config.rewards },
  set rewards(v) { _config.rewards = v }
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
  _config.mapNodes = 10
  _config.getCards = []
  _config.lang = 'ru'
  _config.enemyDifficultyBase = 0.5
  _config.enemyDifficultyMax = 1.5
  _config.portalCost = 200
  _config.premiumPortalActivationCost = 200
  _config.rewards = {
    baseGold: 25,
    goldPerStep: 10,
    bossCrystals: 5
  }

  const paths = ['local_config.json', '/local_config.json']

  for (const path of paths) {
    try {
      const res = await fetch(path + '?v=' + Date.now())
      if (res.ok) {
        const localConfig = await res.json()
        if (localConfig.debug !== undefined) _config.debug = localConfig.debug
        if (localConfig.enemiesCount !== undefined) _config.enemiesCount = localConfig.enemiesCount
        if (localConfig.mapNodes !== undefined) _config.mapNodes = localConfig.mapNodes
        if (localConfig.enemyDifficultyBase !== undefined) _config.enemyDifficultyBase = localConfig.enemyDifficultyBase
        if (localConfig.enemyDifficultyMax !== undefined) _config.enemyDifficultyMax = localConfig.enemyDifficultyMax
        if (localConfig.getCards !== undefined) _config.getCards = localConfig.getCards
        if (localConfig.lang !== undefined) _config.lang = localConfig.lang
        if (localConfig.portalCost !== undefined) _config.portalCost = localConfig.portalCost
        if (localConfig.premiumPortalActivationCost !== undefined) _config.premiumPortalActivationCost = localConfig.premiumPortalActivationCost
        if (localConfig.rewards) _config.rewards = { ..._config.rewards, ...localConfig.rewards }
        log('[Config] Loaded:', localConfig)
        log('[Config] getCards:', _config.getCards)
        break
      }
    } catch (e) { /* ignore */ }
  }
}