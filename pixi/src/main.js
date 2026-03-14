import { Application } from 'pixi.js'
import { Game } from './game.js'
import { soundManager } from './audio/sound_manager.js'
import { LoadingScreen } from './loading_screen.js'
import { loadAllAssets } from './asset_loader.js'

let gameInstance = null

// Константы дизайна
const GAME_WIDTH = 1280
const GAME_HEIGHT = 720
const GAME_ASPECT = GAME_WIDTH / GAME_HEIGHT

async function loadFont() {
  const fontUrl = '/assets/fonts/Monomakh-Regular.ttf'
  try {
    const response = await fetch(fontUrl)
    const fontData = await response.blob()
    const fontFace = new FontFace('Monomakh', await fontData.arrayBuffer())
    await fontFace.load()
    document.fonts.add(fontFace)
    console.log('Font loaded successfully')
  } catch (e) {
    console.warn('Font load failed:', e)
  }
}

// Адаптивный ресайз с letterbox (black bars)
function setupResize(app) {
  const container = document.getElementById('game-container')
  const letterbox = document.getElementById('letterbox')
  
  function updateSize() {
    const winW = window.innerWidth
    const winH = window.innerHeight
    const winAspect = winW / winH
    
    let scale, offsetX = 0, offsetY = 0
    
    if (winAspect > GAME_ASPECT) {
      // Экран шире - добавляем боковые полосы
      scale = winH / GAME_HEIGHT
      offsetX = (winW - GAME_WIDTH * scale) / 2
    } else {
      // Экран уже - добавляем верхние/нижние полосы
      scale = winW / GAME_WIDTH
      offsetY = (winH - GAME_HEIGHT * scale) / 2
    }
    
    // Масштабируем canvas
    app.view.style.width = `${GAME_WIDTH * scale}px`
    app.view.style.height = `${GAME_HEIGHT * scale}px`
    app.view.style.marginLeft = `${offsetX}px`
    app.view.style.marginTop = `${offsetY}px`
    
    // Позиционируем letterbox
    if (letterbox) {
      if (winAspect > GAME_ASPECT) {
        // Боковые полосы
        letterbox.style.left = '0'
        letterbox.style.top = '0'
        letterbox.style.width = `${offsetX}px`
        letterbox.style.height = '100%'
        letterbox.style.right = 'auto'
        letterbox.style.bottom = 'auto'
      } else {
        // Верхние/нижние полосы
        letterbox.style.top = '0'
        letterbox.style.left = '0'
        letterbox.style.width = '100%'
        letterbox.style.height = `${offsetY}px`
        letterbox.style.right = 'auto'
        letterbox.style.bottom = 'auto'
      }
    }
    
    // Сохраняем scale для UI элементов
    app.gameScale = scale
    
    // Обновляем размер рендерера
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
  const app = new Application({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x1a1a2e,
    resolution: 1,
    autoDensity: true,
    antialias: true
  })

  const container = document.getElementById('game-container') || document.body
  container.appendChild(app.view)

  // Показываем экран загрузки
  const loadingScreen = new LoadingScreen(app)
  await loadingScreen.show()
  
  // Загружаем шрифт
  loadingScreen.setProgress(10, 'Загрузка шрифта...')
  await loadFont()
  
  // Загружаем звуки
  loadingScreen.setProgress(30, 'Загрузка звуков...')
  await soundManager.init()
  
  // Загружаем ассеты
  loadingScreen.setProgress(50, 'Загрузка графики...')
  await loadAllAssets((percent, msg) => {
    loadingScreen.setProgress(50 + percent * 0.5, msg)
  })
  
  // Скрываем экран загрузки
  loadingScreen.hide()
  
  console.log('All assets loaded, starting game...')
  
  gameInstance = new Game(app)
  
  // Настраиваем адаптивный ресайз
  setupResize(app)
  
  gameInstance.start()
}

init()