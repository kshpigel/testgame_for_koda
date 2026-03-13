import { Application } from 'pixi.js'
import { Game } from './game.js'

let gameInstance = null

function init() {
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
