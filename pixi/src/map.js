import * as PIXI from 'pixi.js'
import { EventEmitter } from 'events'
import { colors } from './data/colors.js'
import { config, log } from './data/config.js'
import { FONT } from './data/fonts.js'
import { player } from './data/player.js'
import { getEnemyDifficulty } from './data/deck_power.js'
import { Z } from './data/z_index.js'
import { MapNode } from './ui/map_node.js'
import { MapRenderer } from './ui/map_renderer.js'
import { Button } from './ui/button.js'

export class MapScreen extends EventEmitter {
  constructor(app, mapData, enemies, game) {
    super()
    this.app = app
    this.mapData = mapData
    this.enemies = enemies
    this.game = game
    this.container = new PIXI.Container()
    this.container.zIndex = Z.BG_MAP
    this.enemySprites = []
    this.currentEnemyIndex = 0
    
    this.cellSize = Math.min(app.screen.width, app.screen.height) / 20
    
    this.loadAssets()
  }

  async loadAssets() {
    const urls = new Set()
    
    if (this.mapData.image) urls.add(this.mapData.image)
    
    this.enemies.forEach((enemy, index) => {
      if (enemy.image) urls.add(enemy.image)
    })
    
    await PIXI.Assets.load(Array.from(urls))
    
    this.assets = {}
    if (this.mapData.image) {
      this.assets.mapBg = { texture: PIXI.Assets.get(this.mapData.image) }
    }
    
    this.enemies.forEach((enemy, index) => {
      if (enemy.image) {
        this.assets[`enemy_${index}`] = { texture: PIXI.Assets.get(enemy.image) }
      }
    })
    
    this.onAssetsLoaded()
  }

  onAssetsLoaded() {
    this.render()
    this.afterRender()
    this.app.stage.addChild(this.container)
    this.container.alpha = 0
    this.fadeIn()
  }

  show() {
    if (this.assets) {
      log('Map show, currentEnemyIndex:', this.currentEnemyIndex)
      this.render()
      this.afterRender()
      this.app.stage.addChild(this.container)
      this.container.alpha = 0
      this.fadeIn()
    }
  }
  
  afterRender() {
    this.addExitButton()
  }
  
  addExitButton() {
    const exitBtn = new Button('Покинуть', {
      width: 120,
      height: 40,
      color: colors.ui.button.exit,
      fontSize: 16,
      app: this.app,
      onClick: () => {
        this.emit('exit_to_base')
      }
    })
    
    exitBtn.setX(this.app.screen.width - 140)
    exitBtn.setY(50)
    
    this.container.addChild(exitBtn)
  }

  hide() {
    // Останавливаем тикер анимации
    if (this.tickerCallback) {
      this.app.ticker.remove(this.tickerCallback)
    }
    this.fadeOut(() => {
      this.app.stage.removeChild(this.container)
      this.cleanup()
    })
  }

  fadeIn() {
    const animate = () => {
      this.container.alpha += 0.05
      if (this.container.alpha < 1) {
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  fadeOut(callback) {
    const animate = () => {
      this.container.alpha -= 0.05
      if (this.container.alpha <= 0) {
        if (callback) callback()
      } else {
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  render() {
    this.container.removeChildren()
    
    // Используем MapRenderer для фона, заголовка и сетки
    this.mapRenderer = new MapRenderer(this.app, this.mapData, this.assets)
    this.mapRenderer.render()
    this.container.addChild(this.mapRenderer.getContainer())
    
    // Враги
    this.renderEnemies()
  }

  renderEnemies() {
    // Очищаем тикер от предыдущих вызовов
    if (this.tickerCallback) {
      this.app.ticker.remove(this.tickerCallback)
    }
    
    const segments = this.mapData.segments
    const cellW = this.app.screen.width / segments
    const cellH = this.app.screen.height / segments
    const startX = 0
    const startY = 0
    
    // Массив для анимации
    this.animatableEnemies = []

    this.enemies.forEach((enemy, index) => {
      const cellId = this.mapData.places[index]
      if (!cellId) return
      
      const cellNum = parseInt(cellId.replace('cell_', ''))
      const row = Math.floor(cellNum / segments)
      const col = cellNum % segments

      const x = startX + col * cellW + cellW / 2
      const y = startY + row * cellH + cellH / 2

      // Создаём MapNode
      const isBoss = index === this.enemies.length - 1
      
      // Используем difficulty из enemies (уже рассчитан относительно HP)
      const difficulty = enemy.difficulty || 'medium'
      
      const mapNode = new MapNode(enemy, index, this.currentEnemyIndex, this.assets, this.app)
      mapNode.isBoss = isBoss
      mapNode.setDifficulty(difficulty)
      mapNode.setPosition(x, y)
      
      // Обработка клика
      mapNode.on('enemy_click', (enemyData) => {
        this.emit('enemy_click', enemyData)
      })
      
      // Добавляем в массив анимации
      this.animatableEnemies.push(mapNode)

      this.container.addChild(mapNode)
      this.enemySprites.push(mapNode)
    })
    
    // Запускаем тикер для плавной анимации
    this.tickerCallback = () => this.updateEnemies()
    this.app.ticker.add(this.tickerCallback)
  }
  
  updateEnemies() {
    if (!this.animatableEnemies) return
    
    this.animatableEnemies.forEach(mapNode => {
      mapNode.update()
    })
  }

  disableCurrentEnemy() {
    this.currentEnemyIndex++
  }
  
  isLastEnemyDefeated() {
    // Текущий индекс уже увеличен после победы
    // Если мы победили врага с индексом enemies.length - 1 (последний)
    return this.currentEnemyIndex >= this.enemies.length
  }

  cleanup() {
    this.container.removeChildren()
    this.enemySprites = []
  }

  scaleToCover(sprite, targetWidth, targetHeight) {
    const scaleX = targetWidth / sprite.texture.width
    const scaleY = targetHeight / sprite.texture.height
    const scale = Math.max(scaleX, scaleY)
    sprite.scale.set(scale)
    sprite.x = (targetWidth - sprite.texture.width * scale) / 2
    sprite.y = (targetHeight - sprite.texture.height * scale) / 2
  }

  resize(width, height) {
    this.cellSize = Math.min(width, height) / 20
    // Не пересоздаём весь UI - просто пересчитываем размер
  }
}
