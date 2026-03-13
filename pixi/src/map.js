import * as PIXI from 'pixi.js'
import { EventEmitter } from 'events'

export class MapScreen extends EventEmitter {
  constructor(app, mapData, enemies, game) {
    super()
    this.app = app
    this.mapData = mapData
    this.enemies = enemies
    this.game = game
    this.container = new PIXI.Container()
    this.enemySprites = []
    this.currentEnemyIndex = 0
    
    this.cellSize = Math.min(app.screen.width, app.screen.height) / 20
  }

  show() {
    console.log('MapScreen show(), enemies:', this.enemies.length, 'mapData:', this.mapData.name)
    console.log('container:', this.container, 'stage:', this.app.stage)
    console.log('container position:', this.container.x, this.container.y, 'alpha:', this.container.alpha)
    this.render()
    console.log('After render, container children:', this.container.children.length, 'first child:', this.container.children[0])
    this.app.stage.addChild(this.container)
    this.container.alpha = 0
    this.fadeIn()
  }

  hide() {
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
    try {
      console.log('MapScreen render() called')
      this.container.removeChildren()
      console.log('MapScreen render(), container children after remove:', this.container.children.length)
      
      // Заголовок карты
      const title = new PIXI.Text(this.mapData.name, {
        fontFamily: 'Arial',
        fontSize: 32,
        fontWeight: 'bold',
        fill: '#ffffff'
      })
      title.x = 20
      title.y = 20
      this.container.addChild(title)
      console.log('title added, children:', this.container.children.length)

      // Задний фон карты
      const bgGraphics = new PIXI.Graphics()
      bgGraphics.beginFill(0x2d4a3e)
      bgGraphics.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
      bgGraphics.endFill()
      this.container.addChild(bgGraphics)
      console.log('bg added, children:', this.container.children.length)

      // Сетка карты
      this.renderGrid()
      
      // Враги
      this.renderEnemies()
      
      console.log('render complete, children:', this.container.children.length)
    } catch (e) {
      console.error('render error:', e)
    }
  }

  renderGrid() {
    const segments = this.mapData.segments
    const cellW = (this.app.screen.width - 100) / segments
    const cellH = (this.app.screen.height - 150) / segments
    const startX = 50
    const startY = 80

    // Сетка
    const grid = new PIXI.Graphics()
    grid.lineStyle(1, 0x4a6b5c, 0.5)
    
    for (let i = 0; i <= segments; i++) {
      // Вертикальные линии
      grid.moveTo(startX + i * cellW, startY)
      grid.lineTo(startX + i * cellW, startY + segments * cellH)
      // Горизонтальные линии
      grid.moveTo(startX, startY + i * cellH)
      grid.lineTo(startX + segments * cellW, startY + i * cellH)
    }
    this.container.addChild(grid)
  }

  renderEnemies() {
    console.log('renderEnemies called, enemies:', this.enemies)
    const segments = this.mapData.segments
    const cellW = (this.app.screen.width - 100) / segments
    const cellH = (this.app.screen.height - 150) / segments
    const startX = 50
    const startY = 80

    this.enemies.forEach((enemy, index) => {
      const cellId = this.mapData.places[index]
      if (!cellId) return
      
      const cellNum = parseInt(cellId.replace('cell_', ''))
      const row = Math.floor(cellNum / segments)
      const col = cellNum % segments

      const x = startX + col * cellW + cellW / 2
      const y = startY + row * cellH + cellH / 2

      const enemyContainer = new PIXI.Container()
      enemyContainer.x = x
      enemyContainer.y = y

      // Индикатор врага
      const indicator = new PIXI.Graphics()
      const isActive = index === this.currentEnemyIndex
      const isDefeated = index < this.currentEnemyIndex
      
      if (isDefeated) {
        indicator.beginFill(0x666666)
      } else if (isActive) {
        indicator.beginFill(0x00ff00)
      } else {
        indicator.beginFill(0xff6600)
      }
      
      indicator.drawCircle(0, 0, 25)
      indicator.endFill()
      enemyContainer.addChild(indicator)

      // Имя врага
      const nameStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 14,
        fill: isDefeated ? '#666666' : '#ffffff'
      })
      const name = new PIXI.Text(enemy.name, nameStyle)
      name.anchor.set(0.5, 1)
      name.y = -30
      enemyContainer.addChild(name)

      // Здоровье
      const healthStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 12,
        fill: '#ff6666'
      })
      const health = new PIXI.Text('~' + enemy.health, healthStyle)
      health.anchor.set(0.5, 0)
      health.y = 30
      enemyContainer.addChild(health)

      // Делаем активным для клика
      if (!isDefeated) {
        enemyContainer.eventMode = 'static'
        enemyContainer.cursor = 'pointer'
        enemyContainer.on('pointerdown', () => {
          if (index === this.currentEnemyIndex) {
            this.emit('enemy_click', enemy)
          }
        })
      }

      this.container.addChild(enemyContainer)
      this.enemySprites.push(enemyContainer)
    })
    console.log('renderEnemies done, container children:', this.container.children.length)
  }

  disableCurrentEnemy() {
    this.currentEnemyIndex++
  }

  cleanup() {
    this.container.removeChildren()
    this.enemySprites = []
  }

  resize(width, height) {
    this.cellSize = Math.min(width, height) / 20
    this.render()
  }
}
