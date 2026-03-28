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
import { t } from './data/i18n.js'

export class MapScreen extends EventEmitter {
  constructor(app, mapData, enemies, game) {
    super()
    this.app = app
    this.mapData = mapData
    this.enemies = enemies
    this.game = game
    this.container = new PIXI.Container()
    this.container.sortableChildren = true
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
    const exitBtn = new Button(t('map.leave'), {
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
    // Защита от повторного вызова
    if (this._isHiding) return
    this._isHiding = true
    
    // Останавливаем тикер анимации
    if (this.tickerCallback) {
      this.app.ticker.remove(this.tickerCallback)
      this.tickerCallback = null
    }
    this.fadeOut(() => {
      this._isHiding = false
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
    
    // Линии пути (после врагов, чтобы были выше фона)
    this.renderPathLines()
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
    
    // Распределяем врагов по places
    const places = this.mapData.places
    const enemyCount = this.enemies.length
    const placeCount = places.length
    
    // Первый враг - всегда place0, последний (босс) - всегда place9
    // Остальные равномерно между ними с ±1 random
    const step = (placeCount - 1) / (enemyCount - 1)

    // Множество занятых мест
    const usedPlaces = new Set()

    this.enemies.forEach((enemy, index) => {
      let placeIndex
      
      if (index === 0) {
        // Первый враг - place0
        placeIndex = 0
      } else if (index === enemyCount - 1) {
        // Последний враг (босс) - place9
        placeIndex = placeCount - 1
      } else {
        // Остальные равномерно с ±1 random, но без дубликатов
        const baseIndex = Math.floor(index * step)
        
        // Пробуем найти свободное место
        const offsets = [0, -1, 1, -2, 2] // порядок: сначала без смещения, потом ±1, ±2
        placeIndex = -1
        
        for (const offset of offsets) {
          const candidate = baseIndex + offset
          if (candidate > 0 && candidate < placeCount - 1 && !usedPlaces.has(candidate)) {
            placeIndex = candidate
            break
          }
        }
        
        // Если все заняты, берём любое свободное
        if (placeIndex === -1) {
          for (let i = 1; i < placeCount - 1; i++) {
            if (!usedPlaces.has(i)) {
              placeIndex = i
              break
            }
          }
        }
      }
      
      // Запоминаем занятое место
      usedPlaces.add(placeIndex)
      
      const cellId = places[placeIndex]
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
      
      const mapNode = new MapNode(enemy, index, this.currentEnemyIndex, this.assets, this.app, { layer: 'gameObject' })
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
  
  renderPathLines() {
    // Удаляем старые линии
    const oldLines = this.container.getChildByName('pathLines')
    if (oldLines) this.container.removeChild(oldLines)
    
    if (this.enemySprites.length < 2) return
    
    const lines = new PIXI.Graphics()
    lines.name = 'pathLines'
    lines.zIndex = 500 // Между фоном (2) и врагами (1000)
    
    const lineColor = colors.ui.text.primary
    const lineWidth = 3
    const lineAlpha = 0.5
    
    for (let i = 0; i < this.enemySprites.length - 1; i++) {
      const from = this.enemySprites[i]
      const to = this.enemySprites[i + 1]
      
      // Используем _visualX/_visualY для получения центра (без pivot)
      const fromX = from._visualX || from.x
      const fromY = from._visualY || from.y
      const toX = to._visualX || to.x
      const toY = to._visualY || to.y
      
      // Рисуем пунктирную линию от центра врагов
      this.drawDashedLine(lines, fromX, fromY, toX, toY, lineColor, lineWidth, lineAlpha)
    }
    
    this.container.addChildAt(lines, 0)
  }
  
  drawDashedLine(graphics, x1, y1, x2, y2, color, width, alpha = 1) {
    const dashLength = 15
    const gapLength = 15
    const dx = x2 - x1
    const dy = y2 - y1
    const dist = Math.sqrt(dx * dx + dy * dy)
    const ux = dx / dist
    const uy = dy / dist
    
    let currentX = x1
    let currentY = y1
    let drawn = 0
    let isDash = true
    
    while (drawn < dist) {
      const segmentLength = isDash ? dashLength : gapLength
      const len = Math.min(segmentLength, dist - drawn)
      
      if (isDash) {
        graphics.lineStyle(width, color, alpha)
        graphics.moveTo(currentX, currentY)
        graphics.lineTo(currentX + ux * len, currentY + uy * len)
      }
      
      currentX += ux * len
      currentY += uy * len
      drawn += len
      isDash = !isDash
    }
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
    log('[MapScreen] cleanup() START')
    // Удаляем все children с вызовом destroy() (чтобы остановить tickers)
    const children = this.container.children.slice() // копия массива
    log('[MapScreen] cleanup() children count:', children.length)
    
    children.forEach((child, i) => {
      try {
        // Проверяем что child ещё не уничтожен
        if (child && !child._destroyed) {
          this.container.removeChild(child)
          if (child.destroy) {
            child.destroy({ children: true })
          }
        }
      } catch (e) {
        log('[MapScreen] cleanup() error on child', i, e.message)
      }
    })
    this.enemySprites = []
    log('[MapScreen] cleanup() DONE')
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
