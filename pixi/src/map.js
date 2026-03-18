import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { EventEmitter } from 'events'
import { mapConfig, hexToPixi } from './data/map_config.js'
import { colors } from './data/colors.js'
import { config } from './data/config.js'
import { FONT } from './data/fonts.js'
import { soundManager } from './audio/sound_manager.js'

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
    this.app.stage.addChild(this.container)
    this.container.alpha = 0
    this.fadeIn()
  }

  show() {
    if (this.assets) {
      console.log('Map show, currentEnemyIndex:', this.currentEnemyIndex)
      this.render()
      this.app.stage.addChild(this.container)
      this.container.alpha = 0
      this.fadeIn()
    }
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
    
    // Задний фон карты (cover)
    if (this.assets && this.assets.mapBg && this.assets.mapBg.texture) {
      const bg = new PIXI.Sprite(this.assets.mapBg.texture)
      this.scaleToCover(bg, this.app.screen.width, this.app.screen.height)
      this.container.addChild(bg)
    } else if (this.mapData.image) {
      const bg = PIXI.Sprite.from(this.mapData.image)
      this.scaleToCover(bg, this.app.screen.width, this.app.screen.height)
      this.container.addChild(bg)
    } else {
      const bg = new PIXI.Graphics()
      bg.beginFill(colors.background.map)
      bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
      bg.endFill()
      this.container.addChild(bg)
    }
    
    // Заголовок карты с фоном
    const titleBg = new PIXI.Graphics()
    titleBg.beginFill(colors.ui.panel.bg, 0.8)
    titleBg.drawRoundedRect(10, 10, 350, 50, 15)
    titleBg.endFill()
    this.container.addChild(titleBg)
    
    const title = new PIXI.Text(this.mapData.name, {
      fontFamily: FONT,
      fontSize: 32,
      fontWeight: 'bold',
      fill: colors.ui.text.primary
    })
    title.x = 25
    title.y = 20
    this.container.addChild(title)
    
    // Сетка карты
    this.renderGrid()
    
    // Враги
    this.renderEnemies()
  }

  renderGrid() {
    if (!config.debug) return
    
    const segments = this.mapData.segments
    const cellW = (this.app.screen.width - 100) / segments
    const cellH = (this.app.screen.height - 150) / segments
    const startX = 50
    const startY = 80

    const grid = new PIXI.Graphics()
    grid.lineStyle(2, colors.map.grid, 0.5)
    
    for (let i = 0; i <= segments; i++) {
      grid.moveTo(startX + i * cellW, startY)
      grid.lineTo(startX + i * cellW, startY + segments * cellH)
      grid.moveTo(startX, startY + i * cellH)
      grid.lineTo(startX + segments * cellW, startY + i * cellH)
    }
    this.container.addChild(grid)
  }

  renderEnemies() {
    // Очищаем тикер от предыдущих вызовов
    if (this.tickerCallback) {
      this.app.ticker.remove(this.tickerCallback)
    }
    
    const cfg = mapConfig ? mapConfig.enemy : {
      maxHeight: 90, offsetY: 30, spriteOffsetY: 20,
      platform: { radius: 45, offsetY: 30, colors: colors.enemy.platform },
      bossRing: { radius: 50, offsetY: 0, color: '#8c1300', lineWidth: 3 },
      name: { offsetY: -55 }, health: { bg: { width: 50, height: 20, offsetY: 60 }, text: { offsetY: 70 } },
      defeated: { offsetY: 90 }
    }
    const segments = this.mapData.segments
    const cellW = (this.app.screen.width - 100) / segments
    const cellH = (this.app.screen.height - 150) / segments
    const startX = 50
    const startY = 80
    
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

      const enemyContainer = new PIXI.Container()
      enemyContainer.x = x
      enemyContainer.y = y
      enemyContainer.baseScale = 1
      enemyContainer.targetScale = 1

      const isActive = index === this.currentEnemyIndex
      const isDefeated = index < this.currentEnemyIndex
      const isBoss = index === this.enemies.length - 1
      
      // Кольцо вокруг врага (задний план)
      let ringColor, ringAlpha
      if (isDefeated) {
        ringColor = colors.enemy.ring.defeated
        ringAlpha = 0.3
      } else if (isBoss) {
        ringColor = colors.enemy.ring.boss
        ringAlpha = 1
      } else if (isActive) {
        ringColor = colors.enemy.ring.active
        ringAlpha = 1
      } else {
        ringColor = colors.enemy.ring.default
        ringAlpha = 0.6
      }
      
      const ring = new PIXI.Graphics()
      ring.lineStyle(3, hexToPixi(ringColor), ringAlpha)
      ring.drawCircle(0, cfg.platform.offsetY + cfg.offsetY, cfg.platform.radius + 8)
      enemyContainer.addChild(ring)
      
      // Круг под врагом (платформа) - средний план
      const platform = new PIXI.Graphics()
      let platformColor, platformAlpha
      if (isDefeated) {
        platformColor = hexToPixi(cfg.platform.colors.defeated)
        platformAlpha = 0.5
      } else if (isActive) {
        platformColor = hexToPixi(cfg.platform.colors.active)
        platformAlpha = 0.8
      } else {
        platformColor = hexToPixi(cfg.platform.colors.default)
        platformAlpha = 0.7
      }
      platform.beginFill(platformColor, platformAlpha)
      platform.drawCircle(0, cfg.platform.offsetY + cfg.offsetY, cfg.platform.radius)
      platform.endFill()
      enemyContainer.addChild(platform)

      // Изображение врага (передний план)
      const spriteY = cfg.offsetY + cfg.spriteOffsetY
      let enemySprite = null
      
      if (this.assets && this.assets[`enemy_${index}`] && this.assets[`enemy_${index}`].texture) {
        enemySprite = new PIXI.Sprite(this.assets[`enemy_${index}`].texture)
        enemySprite.anchor.set(0.5, 1)
        const scale = Math.min(1, cfg.maxHeight / enemySprite.texture.height)
        enemySprite.scale.set(scale)
        enemySprite.y = spriteY
        enemyContainer.addChild(enemySprite)
      } else if (enemy.image) {
        enemySprite = PIXI.Sprite.from(enemy.image)
        enemySprite.anchor.set(0.5, 1)
        const scale = Math.min(1, cfg.maxHeight / enemySprite.texture.height)
        enemySprite.scale.set(scale)
        enemySprite.y = spriteY
        enemyContainer.addChild(enemySprite)
      }
      
      // Применяем grayscale к побеждённым врагам
      if (isDefeated && enemySprite) {
        const grayscaleFilter = new ColorMatrixFilter()
        grayscaleFilter.grayscale()
        enemySprite.filters = [grayscaleFilter]
      }
      
      if (!enemySprite) {
        // Заглушка
        const placeholder = new PIXI.Graphics()
        if (isDefeated) placeholder.beginFill(colors.map.platform.defeated)
    else if (isActive) placeholder.beginFill(colors.map.platform.active)
    else placeholder.beginFill(colors.map.platform.locked)
        placeholder.drawCircle(0, spriteY - 20, 30)
        placeholder.endFill()
        enemyContainer.addChild(placeholder)
      }

      // Имя врага
      const nameStyle = new PIXI.TextStyle({
        fontFamily: FONT,
        fontSize: 14,
        fontWeight: 'bold',
        fill: isDefeated ? colors.enemy.platform.defeated : colors.ui.text.primary
      })
      const name = new PIXI.Text(enemy.name, nameStyle)
      name.anchor.set(0.5, 1)
      name.y = spriteY + cfg.name.offsetY
      enemyContainer.addChild(name)

      // Здоровье
      const healthBg = new PIXI.Graphics()
      healthBg.beginFill(colors.enemy.healthBg, 0.6)
      healthBg.drawRoundedRect(-cfg.health.bg.width/2, spriteY + cfg.health.bg.offsetY, cfg.health.bg.width, cfg.health.bg.height, 5)
      healthBg.endFill()
      enemyContainer.addChild(healthBg)
      
      const healthStyle = new PIXI.TextStyle({
        fontFamily: FONT,
        fontSize: 12,
        fill: isDefeated ? '#666666' : '#ff6666'
      })
      const health = new PIXI.Text('~' + enemy.health, healthStyle)
      health.anchor.set(0.5)
      health.y = spriteY + cfg.health.text.offsetY
      enemyContainer.addChild(health)
      
      // Статус "Побежден"
      if (isDefeated) {
        const defeatedText = new PIXI.Text('Побежден', {
          fontFamily: FONT,
          fontSize: 16,
          fontWeight: 'bold',
          fill: '#666666'
        })
        defeatedText.anchor.set(0.5)
        defeatedText.y = spriteY + cfg.defeated.offsetY
        enemyContainer.addChild(defeatedText)
      }

      // Интерактивность
      if (!isDefeated) {
        enemyContainer.eventMode = 'static'
        enemyContainer.cursor = 'pointer'
        
        // Светящийся ореол при наведении
        const glowFilter = new ColorMatrixFilter()
        glowFilter.brightness(1.3, false)
        
        // Сохраняем grayscale фильтр для побеждённых
        const grayscaleFilter = new ColorMatrixFilter()
        grayscaleFilter.grayscale()
        
        enemyContainer.on('pointerover', () => {
          enemyContainer.targetScale = 1.1
          if (isActive) platform.alpha = 1
          // Добавляем glow-эффект (кроме побеждённых)
          if (enemySprite && !isDefeated) {
            enemySprite.filters = [glowFilter]
          }
          soundManager.play('hover')
        })
        
        enemyContainer.on('pointerout', () => {
          enemyContainer.targetScale = 1
          platform.alpha = isActive ? 0.8 : 0.7
          // Убираем glow-эффект, восстанавливаем grayscale если был
          if (enemySprite) {
            enemySprite.filters = isDefeated ? [grayscaleFilter] : null
          }
        })
        
        enemyContainer.on('pointerdown', () => {
          if (index === this.currentEnemyIndex) {
            soundManager.play('click')
            this.emit('enemy_click', enemy)
          }
        })
        
        // Добавляем в массив анимации
        this.animatableEnemies.push(enemyContainer)
      }

      this.container.addChild(enemyContainer)
      this.enemySprites.push(enemyContainer)
    })
    
    // Запускаем тикер для плавной анимации
    this.tickerCallback = () => this.updateEnemies()
    this.app.ticker.add(this.tickerCallback)
  }
  
  updateEnemies() {
    if (!this.animatableEnemies) return
    
    this.animatableEnemies.forEach(enemy => {
      // Плавная интерполяция scale
      const diff = enemy.targetScale - enemy.scale.x
      if (Math.abs(diff) > 0.001) {
        enemy.scale.set(enemy.scale.x + diff * 0.15)
      } else {
        enemy.scale.set(enemy.targetScale)
      }
    })
  }

  disableCurrentEnemy() {
    this.currentEnemyIndex++
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
