import * as PIXI from 'pixi.js'
import { Battle } from './battle.js'
import { MapScreen } from './map.js'
import { card_types } from './data/card_types.js'
import { deck } from './data/deck.js'
import { enemies } from './data/enemies.js'
import { maps } from './data/maps.js'

export class Game {
  constructor(app) {
    this.app = app
    this.screens = {}
    this.currentScreen = null
    this.user = { points: 0 }

    this.screenContainer = new PIXI.Container()
    this.app.stage.addChild(this.screenContainer)

    this.messageContainer = new PIXI.Container()
    this.app.stage.addChild(this.messageContainer)
  }

  start() {
    console.log('Game starting...', this.app.screen)
    this.showMap()
    console.log('Map shown, container children:', this.screenContainer.children.length)
  }

  showMap() {
    this.hideCurrentScreen()
    const mapScreen = new MapScreen(this.app, maps[0], enemies, this)
    mapScreen.on('enemy_click', (enemyData) => this.initBattle(enemyData))
    this.screens['map'] = mapScreen
    this.currentScreen = mapScreen
    mapScreen.show()
  }

  initBattle(enemyData) {
    this.hideCurrentScreen()
    const battle = new Battle(this.app, deck, card_types, enemyData, this)
    battle.on('end', () => this.showMap())
    battle.on('victory', (points) => {
      this.user.points += points
      this.showMessage(`Победа! +${points} очков`, 0x00ff00)
    })
    battle.on('defeat', () => {
      this.showMessage('Поражение!', 0xff0000)
    })
    this.screens['battle'] = battle
    this.currentScreen = battle
    battle.start()
  }

  hideCurrentScreen() {
    if (this.currentScreen) {
      this.currentScreen.hide()
    }
  }

  showMessage(text, color = 0xffffff) {
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 36,
      fontWeight: 'bold',
      fill: color,
      stroke: '#000000',
      strokeThickness: 4
    })

    const message = new PIXI.Text(text, style)
    message.anchor.set(0.5)
    message.x = this.app.screen.width / 2
    message.y = this.app.screen.height / 2
    this.messageContainer.addChild(message)

    let alpha = 1
    const fadeOut = () => {
      alpha -= 0.02
      message.alpha = alpha
      if (alpha <= 0) {
        this.messageContainer.removeChild(message)
        message.destroy()
      } else {
        requestAnimationFrame(fadeOut)
      }
    }
    setTimeout(fadeOut, 2000)
  }

  resize(width, height) {
    if (this.currentScreen && this.currentScreen.resize) {
      this.currentScreen.resize(width, height)
    }
  }
}
