import { Application } from 'pixi.js'
import { Game } from './game.js'
import { soundManager } from './audio/sound_manager.js'
import { loadAllAssets } from './asset_loader.js'
import { colors } from './data/colors.js'
import { config, loadConfig, log } from './data/config.js'
import { loadTranslations, t } from './data/i18n.js'

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

// Адаптивный ресайз с центрированием и макс. шириной
function setupResize(app) {
  const container = document.getElementById('game-container')
  
  function updateSize() {
    const winW = window.innerWidth
    const winH = window.innerHeight
    
    // Максимальная ширина 1600
    const maxWidth = Math.min(winW, 1600)
    const maxHeight = Math.min(winH, 900)
    
    // Соотношение сторон
    const targetAspect = GAME_WIDTH / GAME_HEIGHT
    const winAspect = maxWidth / maxHeight
    
    let scale, renderW, renderH
    
    if (winAspect > targetAspect) {
      // Экран шире - ограничиваем по высоте
      scale = maxHeight / GAME_HEIGHT
      renderH = GAME_HEIGHT
      renderW = GAME_WIDTH
    } else {
      // Экран уже - ограничиваем по ширине
      scale = maxWidth / GAME_WIDTH
      renderH = GAME_HEIGHT
      renderW = GAME_WIDTH
    }
    
    // Применяем масштаб и центрируем
    app.view.style.position = 'absolute'
    app.view.style.left = '50%'
    app.view.style.top = '50%'
    app.view.style.transform = `translate(-50%, -50%) scale(${scale})`
    app.view.style.transformOrigin = 'center center'
    
    // Сохраняем scale для UI элементов
    app.gameScale = scale
    
    // Обновляем размер рендерера (всегда 1600x900)
    app.renderer.resize(GAME_WIDTH, GAME_HEIGHT)
    
    // Уведомляем игру
    if (gameInstance) {
      gameInstance.resize(GAME_WIDTH, GAME_HEIGHT, scale)
    }
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
  
  // Функция запуска загрузки при нажатии "Играть"
  async function startLoading() {
    const startScreen = gameInstance.startScreen
    
    // Загружаем шрифт
    startScreen.setLoadingText(t('loading.font'))
    await loadFont()
    
    // Загружаем звуки
    startScreen.setLoadingText(t('loading.sounds'))
    await soundManager.init()
    
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