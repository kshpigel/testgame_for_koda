import { Application } from 'pixi.js'
import { Game } from './game.js'
import { soundManager } from './audio/sound_manager.js'

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
  // Ждём загрузки шрифта
  await loadFont()
  
  // Инициализируем звуки
  await soundManager.init()
  
  const app = new Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a1a2e,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true
  })

  const container = document.getElementById('game-container') || document.body
  container.appendChild(app.view)

  console.log('PIXI app created, stage:', app.stage, 'view:', app.view)
  
  gameInstance = new Game(app)
  gameInstance.start()
  
  console.log('After game.start(), stage children:', app.stage.children.length)

  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    gameInstance.resize(window.innerWidth, window.innerHeight)
  })
}

init()
