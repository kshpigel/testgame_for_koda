import { Application } from 'pixi.js'
import { Game } from './game.js'
import { soundManager } from './audio/sound_manager.js'
import { loadAllAssets } from './asset_loader.js'
import { colors } from './data/colors.js'
import { config, loadConfig, log } from './data/config.js'
import { loadTranslations, t } from './data/i18n.js'
import { portalManager } from './data/portal_manager.js'
import { gamePrices } from './data/game_prices.js'
import { loadCards } from './data/cards.js'
import { loadEnemies } from './data/enemies/index.js'

// Регистрация Service Worker для PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => log('[SW] Registered:', reg.scope))
      .catch(err => log('[SW] Registration failed:', err))
  })
}

let gameInstance = null

// Константы дизайна
const GAME_WIDTH = 1600
const GAME_HEIGHT = 900
const GAME_ASPECT = GAME_WIDTH / GAME_HEIGHT

async function loadFont() {
  const fontUrl = '/assets/fonts/Monomakh-Regular.ttf'
  try {
    const response = await fetch(fontUrl)
    const fontData = await response.blob()
    const fontFace = new FontFace('Monomakh', await fontData.arrayBuffer())
    await fontFace.load()
    document.fonts.add(fontFace)
    log('Font loaded successfully')
  } catch (e) {
    console.warn('Font load failed:', e)
  }
}

// Адаптивный ресайз через CSS transform
function setupResize(app) {
  function updateSize() {
    const winW = window.innerWidth
    const winH = window.innerHeight
    
    // Масштаб: сохраняем пропорции 1600x900
    const scale = Math.min(winW / GAME_WIDTH, winH / GAME_HEIGHT)
    
    // Растягиваем canvas через CSS
    app.view.style.position = 'fixed'
    app.view.style.left = '50%'
    app.view.style.top = '50%'
    app.view.style.transformOrigin = 'center center'
    app.view.style.transform = `translate(-50%, -50%) scale(${scale})`
    
    // Сохраняем scale для UI элементов
    app.gameScale = scale
    
    log('[main] Resize:', winW, 'x', winH, 'scale:', scale.toFixed(3))
  }
  
  window.addEventListener('resize', updateSize)
  updateSize()
  
  return updateSize
}

async function init() {
  // Загружаем конфиг (сначала дефолтный, потом пытаемся переопределить из local_config.json)
  await loadConfig()
  
  // Загружаем переводы
  await loadTranslations(config.lang)
  
  log('Game starting after loading...')
  
  const app = new Application({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: colors.background.battle,
    resolution: 2,
    autoDensity: true,
    antialias: true
  })

  const container = document.getElementById('game-container') || document.body
  container.appendChild(app.view)

  // Создаём игру (без старта)
  gameInstance = new Game(app)
  
  // Делаем portalManager доступным для GameState
  window.portalManager = portalManager
  
  // Функция запуска загрузки при нажатии "Играть"
  async function startLoading() {
    const startScreen = gameInstance.startScreen
    
    // Загружаем шрифт
    startScreen.setLoadingText(t('loading.font'))
    await loadFont()
    
    // Загружаем цены
    startScreen.setLoadingText('Загрузка цен...')
    await gamePrices.load()
    
    // Загружаем звуки
    startScreen.setLoadingText(t('loading.sounds'))
    await soundManager.init()
    
    // Загружаем данные карт и врагов
    startScreen.setLoadingText('Загрузка данных...')
    const cardsData = await loadCards()
    const enemiesData = await loadEnemies()
    
    // Инициализируем MapGenerator с загруженными данными
    gameInstance.initMapGenerator(cardsData, enemiesData)
    
    // Загружаем ассеты
    startScreen.setLoadingText('Загрузка графики...')
    await loadAllAssets((percent, msg) => {
      startScreen.setLoadingText(msg)
    })
    
    // Всё загружено - запускаем игру
    log('All assets loaded, starting game...')
    startScreen.setLoadingText(t('loading.done'))
    
    // Небольшая пауза для чтения "Готово!"
    await new Promise(r => setTimeout(r, 500))
    
    gameInstance.start()
  }
  
  gameInstance.setLoadingCallback(startLoading)
  
  // Настраиваем адаптивный ресайз
  setupResize(app)
  
  // Показываем стартовый экран
  gameInstance.showStartScreen()
}

init()