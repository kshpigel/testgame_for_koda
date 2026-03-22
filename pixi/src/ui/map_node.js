import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import { mapConfig, hexToPixi } from '../data/map_config.js'
import { colors } from '../data/colors.js'
import { FONT } from '../data/fonts.js'
import { soundManager } from '../audio/sound_manager.js'
import { config } from '../data/config.js'
import { UINode } from './ui_node.js'

export class MapNode extends UINode {
  constructor(enemy, index, currentEnemyIndex, assets, app, options = {}) {
    // Определяем размеры ноды
    const cfg = mapConfig ? mapConfig.enemy : {
      maxHeight: 90, offsetY: 30, spriteOffsetY: 20,
      platform: { radius: 45, offsetY: 30, colors: colors.enemy.platform },
      name: { offsetY: -55 }, health: { bg: { width: 50, height: 20, offsetY: 60 }, text: { offsetY: 70 } },
      defeated: { offsetY: 90 }
    }
    const size = cfg.platform.radius * 2 + 40 // платформа + отступы
    
    super({
      width: size,
      height: size,
      app: app,
      scaleSpeed: 0.15,
      layer: options.layer || 'gameObject'
    })
    
    this.enemy = enemy
    this.index = index
    this.currentEnemyIndex = currentEnemyIndex
    this.assets = assets
    
    this.isActive = index === currentEnemyIndex
    this.isDefeated = index < currentEnemyIndex
    this.isBoss = false
    this.targetScale = 1
    
    this.create(cfg)
  }
  
  create(cfg) {
    const spriteY = cfg.offsetY + cfg.spriteOffsetY
    
    // Кольцо вокруг врага
    this.renderRing(cfg)
    
    // Платформа
    this.renderPlatform(cfg)
    
    // Изображение врага
    this.renderSprite(cfg)
    
    // Имя
    this.renderName(cfg, spriteY)
    
    // Здоровье
    this.renderHealth(cfg, spriteY)
    
    // Статус "Побежден"
    if (this.isDefeated) {
      this.renderDefeated(cfg, spriteY)
    }
    
    // Интерактивность
    if (!this.isDefeated) {
      this.setupInteraction(cfg, spriteY)
    }
    
    this.updateDebug()
  }
  
  renderRing(cfg) {
    let ringColor, ringAlpha
    if (this.isDefeated) {
      ringColor = colors.enemy.ring.defeated
      ringAlpha = 0.3
    } else if (this.isBoss) {
      ringColor = colors.enemy.ring.boss
      ringAlpha = 1
    } else if (this.isActive) {
      ringColor = colors.enemy.ring.active
      ringAlpha = 1
    } else if (this.difficulty) {
      ringColor = colors.enemy.ring[this.difficulty] || colors.enemy.ring.default
      ringAlpha = 0.8
    } else {
      ringColor = colors.enemy.ring.default
      ringAlpha = 0.6
    }
    
    this.ring = new PIXI.Graphics()
    this.ring.lineStyle(3, hexToPixi(ringColor), ringAlpha)
    this.ring.drawCircle(0, cfg.platform.offsetY + cfg.offsetY, cfg.platform.radius + 8)
    this.addChild(this.ring)
  }
  
  renderPlatform(cfg) {
    let platformColor, platformAlpha
    if (this.isDefeated) {
      platformColor = hexToPixi(cfg.platform.colors.defeated)
      platformAlpha = 0.5
    } else if (this.isActive) {
      platformColor = hexToPixi(cfg.platform.colors.active)
      platformAlpha = 0.8
    } else {
      platformColor = hexToPixi(cfg.platform.colors.default)
      platformAlpha = 0.7
    }
    
    this.platform = new PIXI.Graphics()
    this.platform.beginFill(platformColor, platformAlpha)
    this.platform.drawCircle(0, cfg.platform.offsetY + cfg.offsetY, cfg.platform.radius)
    this.platform.endFill()
    this.addChild(this.platform)
  }
  
  renderSprite(cfg) {
    const spriteY = cfg.offsetY + cfg.spriteOffsetY
    let enemySprite = null
    
    if (this.assets && this.assets[`enemy_${this.index}`] && this.assets[`enemy_${this.index}`].texture) {
      enemySprite = new PIXI.Sprite(this.assets[`enemy_${this.index}`].texture)
      enemySprite.anchor.set(0.5, 1)
      const scale = Math.min(1, cfg.maxHeight / enemySprite.texture.height)
      enemySprite.scale.set(scale)
      enemySprite.y = spriteY
      this.addChild(enemySprite)
    } else if (this.enemy.image) {
      enemySprite = PIXI.Sprite.from(this.enemy.image)
      enemySprite.anchor.set(0.5, 1)
      const scale = Math.min(1, cfg.maxHeight / enemySprite.texture.height)
      enemySprite.scale.set(scale)
      enemySprite.y = spriteY
      this.addChild(enemySprite)
    }
    
    if (this.isDefeated && enemySprite) {
      const grayscaleFilter = new ColorMatrixFilter()
      grayscaleFilter.grayscale()
      enemySprite.filters = [grayscaleFilter]
    }
    
    this.enemySprite = enemySprite
  }
  
  renderName(cfg, spriteY) {
    const nameStyle = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 14,
      fontWeight: 'bold',
      fill: this.isDefeated ? colors.enemy.platform.defeated : colors.ui.text.primary
    })
    this.name = new PIXI.Text(this.enemy.name, nameStyle)
    this.name.anchor.set(0.5, 1)
    this.name.y = spriteY + cfg.name.offsetY
    this.addChild(this.name)
  }
  
  renderHealth(cfg, spriteY) {
    const healthBg = new PIXI.Graphics()
    healthBg.beginFill(colors.enemy.healthBg, 0.6)
    healthBg.drawRoundedRect(-cfg.health.bg.width/2, spriteY + cfg.health.bg.offsetY, cfg.health.bg.width, cfg.health.bg.height, 5)
    healthBg.endFill()
    this.addChild(healthBg)
    
    const healthStyle = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 12,
      fill: this.isDefeated ? '#666666' : '#ff6666'
    })
    this.health = new PIXI.Text('~' + this.enemy.health, healthStyle)
    this.health.anchor.set(0.5)
    this.health.y = spriteY + cfg.health.text.offsetY
    this.addChild(this.health)
  }
  
  renderDefeated(cfg, spriteY) {
    const defeatedText = new PIXI.Text('Побежден', {
      fontFamily: FONT,
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#666666'
    })
    defeatedText.anchor.set(0.5)
    defeatedText.y = spriteY + cfg.defeated.offsetY
    this.addChild(defeatedText)
  }
  
  setupInteraction(cfg, spriteY) {
    this.eventMode = 'static'
    this.cursor = 'pointer'
    
    const glowFilter = new ColorMatrixFilter()
    glowFilter.brightness(1.3, false)
    
    const grayscaleFilter = new ColorMatrixFilter()
    grayscaleFilter.grayscale()
    
    this.on('pointerover', () => {
      this.setScale(1.1)
      if (this.isActive) this.platform.alpha = 1
      if (this.enemySprite && !this.isDefeated) {
        this.enemySprite.filters = [glowFilter]
      }
      soundManager.play('hover')
    })
    
    this.on('pointerout', () => {
      this.setScale(1)
      this.platform.alpha = this.isActive ? 0.8 : 0.7
      if (this.enemySprite) {
        this.enemySprite.filters = this.isDefeated ? [grayscaleFilter] : null
      }
    })
    
    this.on('pointerdown', () => {
      if (this.isActive) {
        soundManager.play('click')
        this.emit('enemy_click', this.enemy)
      }
    })
  }
  
  update() {
    // UINode сам обрабатывает scale через setScale()
  }
  
  setPosition(x, y) {
    this.setX(x)
    this.setY(y)
  }
  
  setBoss(isBoss) {
    this.isBoss = isBoss
  }
  
  setDifficulty(difficulty) {
    this.difficulty = difficulty
    // Перерисовываем кольцо с учётом сложности
    if (this.ring) {
      this.removeChild(this.ring)
      this.ring.destroy()
      
      let ringColor, ringAlpha
      if (this.isDefeated) {
        ringColor = colors.enemy.ring.defeated
        ringAlpha = 0.3
      } else if (this.isBoss) {
        ringColor = colors.enemy.ring.boss
        ringAlpha = 1
      } else if (this.isActive) {
        ringColor = colors.enemy.ring.active
        ringAlpha = 1
      } else if (this.difficulty) {
        ringColor = colors.enemy.ring[this.difficulty] || colors.enemy.ring.default
        ringAlpha = 0.8
      } else {
        ringColor = colors.enemy.ring.default
        ringAlpha = 0.6
      }
      
      const cfg = mapConfig ? mapConfig.enemy : { platform: { radius: 45, offsetY: 30, colors: colors.enemy.platform }, offsetY: 30 }
      const ringY = cfg.platform.offsetY + cfg.offsetY
      
      this.ring = new PIXI.Graphics()
      this.ring.lineStyle(3, hexToPixi(ringColor), ringAlpha)
      this.ring.drawCircle(0, ringY, cfg.platform.radius + 8)
      this.addChildAt(this.ring, 0)
    }
    
    this.updateDebug()
  }
}