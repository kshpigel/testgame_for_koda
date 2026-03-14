import { Application } from 'pixi.js'
import { Game } from './game.js'
import { soundManager } from './audio/sound_manager.js'
import { LoadingScreen } from './loading_screen.js'
import { loadAllAssets } from './asset_loader.js'

let gameInstance = null

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

async function init() {
  // Создаём приложение
  // Фиксированный размер 1280x720
  const GAME_WIDTH = 1280
  const GAME_HEIGHT = 720
  
  const app = new Application({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x1a1a2e,
    resolution: window.devicePixelRatio || 1,
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
  gameInstance.start()

  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    if (gameInstance) {
      gameInstance.resize(window.innerWidth, window.innerHeight)
    }
  })
}

init()