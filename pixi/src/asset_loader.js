import { t } from './data/i18n.js'

// Список всех ассетов для предзагрузки
const ASSETS = {
  // Фоны
  bgFull: '/assets/img/bg_full.jpg',
  bg: '/assets/img/bg.jpg',
  field: '/assets/img/field.png',
  
  // Карты
  card: '/assets/img/card.png',
  cardBack: '/assets/img/card_back.png',
  
  // Карты типов
  cards: [
    '/assets/img/cards/type1.png',
    '/assets/img/cards/type2.png',
    '/assets/img/cards/type3.png',
    '/assets/img/cards/type4.png',
    '/assets/img/cards/type5.png',
    '/assets/img/cards/type6.png',
    '/assets/img/cards/type7.png',
    '/assets/img/cards/type8.png',
    '/assets/img/cards/type9.png',
    '/assets/img/cards/type10.png',
    '/assets/img/cards/type11.png'
  ],
  
  // Враги
  enemies: [
    '/assets/img/enemies/bandits.png',
    '/assets/img/enemies/barbarian.png',
    '/assets/img/enemies/dark_mage.png',
    '/assets/img/enemies/dragon.png',
    '/assets/img/enemies/druid.png',
    '/assets/img/enemies/gold_knight.png'
  ],
  
  // Карты
  maps: [
    '/assets/img/maps/map1.png',
    '/assets/img/maps/map2.png',
    '/assets/img/maps/map3.png',
    '/assets/img/maps/map4.png',
    '/assets/img/maps/map5.png',
    '/assets/img/maps/map6.png'
  ],
  
  // Бой
  battleBg: [
    '/assets/img/battle_bg/bg1.png',
    '/assets/img/battle_bg/bg2.png',
    '/assets/img/battle_bg/bg3.png'
  ],
  
  // Результаты
  victory: '/assets/img/victory.png',
  fail: '/assets/img/fail.jpg'
}

export async function loadAllAssets(onProgress) {
  const assets = []
  const names = []
  
  // Собираем все ассеты в плоский массив
  for (const [key, value] of Object.entries(ASSETS)) {
    if (Array.isArray(value)) {
      value.forEach((path, i) => {
        assets.push(path)
        names.push(`${key}_${i}`)
      })
    } else {
      assets.push(value)
      names.push(key)
    }
  }
  
  let loaded = 0
  const total = assets.length
  
  for (let i = 0; i < assets.length; i++) {
    try {
      await PIXI.Assets.load(assets[i])
    } catch (e) {
      // Игнорируем отсутствующие файлы
    }
    
    loaded++
    if (onProgress) {
      const percent = (loaded / total) * 100
      onProgress(percent, `${t('loading.loading')} ${loaded}/${total}`)
    }
  }
  
  return true
}

export { ASSETS }
