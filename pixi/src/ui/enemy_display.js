import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { UINode } from './ui_node.js'
import { TextNode } from './text_node.js'
import { VideoEnemy } from './video_enemy.js'
import { log } from '../data/config.js'

export class EnemyDisplay extends UINode {
  constructor(app, enemyData, assets, isBattle = false) {
    super({
      width: 300,
      height: 350,
      app: app
    })
    
    this.enemyData = enemyData
    this.assets = assets
    this.isBattle = isBattle
    this.videoEnemy = null
    
    this.create()
    this.updateDebug()
  }
  
  create() {
    // Позиции относительно центра (благодаря UINode pivot по центру)
    const enemyY = 0
    const nameY = -30
    const healthY = 60
    
    // Логика выбора изображения:
    // В БОЮ (isBattle = true) + есть animation → используем WebM
    // В КАРТЕ/ДИАЛОГЕ (isBattle = false) или нет animation → используем PNG
    const useAnimation = this.isBattle && this.enemyData.animation
    
    if (useAnimation) {
      // Используем анимацию (WebM) для боя
      log('Creating video enemy (battle):', this.enemyData.animation)
      this.videoEnemy = new VideoEnemy(this._app, {
        videoPath: this.enemyData.animation,
        width: 300,
        height: 280
      })
      // VideoEnemy центрирован (anchor 0.5, 0.5), сдвигаем на половину размеров влево/вверх
      // Чтобы центр VideoEnemy совпал с нужной точкой
      this.videoEnemy.x = 150 - 150  // 150 - половина ширины (300/2)
      this.videoEnemy.y = enemyY + 50 - 140  // 50 - половина высоты (280/2)
      log('VideoEnemy added, x:', this.videoEnemy.x, 'y:', this.videoEnemy.y)
      this.addChild(this.videoEnemy)
    } else if (this.assets && this.assets.enemy && this.assets.enemy.texture) {
      // Статичное изображение из загруженных ассетов
      const enemySprite = new PIXI.Sprite(this.assets.enemy.texture)
      enemySprite.anchor.set(0.5, 1)
      const scale = Math.min(1, 286 / enemySprite.texture.height)
      enemySprite.scale.set(scale)
      enemySprite.y = enemyY + 50
      this.addChild(enemySprite)
    } else if (this.enemyData.image) {
      // Статичное изображение по пути (PNG)
      const enemySprite = PIXI.Sprite.from(this.enemyData.image)
      enemySprite.anchor.set(0.5, 1)
      const scale = Math.min(1, 286 / enemySprite.texture.height)
      enemySprite.scale.set(scale)
      enemySprite.y = enemyY + 50
      this.addChild(enemySprite)
    }
    
    // Имя врага через TextNode
    this.nameText = new TextNode({
      text: this.enemyData.name,
      width: 300,
      height: 50,
      fontSize: 40,
      color: colors.ui.text.primary,
      align: 'center',
      shadow: true,
      bold: true,
      app: this._app
    })
    this.nameText.x = 150
    this.nameText.y = nameY + 50
    this.addChild(this.nameText)
    
    // Здоровье врага
    const healthBg = new PIXI.Graphics()
    healthBg.lineStyle(1, colors.ui.text.primary)
    healthBg.beginFill(colors.ui.button.reset)
    healthBg.drawRoundedRect(-115, healthY - 25, 230, 50, 14)
    healthBg.endFill()
    this.addChild(healthBg)
    
    const healthStyle = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 34,
      fontWeight: 'bold',
      fill: colors.ui.text.primary
    })
    this.healthText = new PIXI.Text('', healthStyle)
    this.healthText.anchor.set(0.5)
    this.healthText.y = healthY
    this.addChild(this.healthText)
    
    // Сила атаки (отображается при выборе карт)
    const attackY = healthY + 50
    const attackBg = new PIXI.Graphics()
    attackBg.lineStyle(1, colors.ui.text.primary)
    attackBg.beginFill(colors.ui.button.play)
    attackBg.drawRoundedRect(-80, attackY - 20, 160, 40, 10)
    attackBg.endFill()
    attackBg.visible = false
    this.attackBg = attackBg
    this.addChild(attackBg)
    
    const attackStyle = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 28,
      fontWeight: 'bold',
      fill: colors.ui.text.primary
    })
    this.attackText = new PIXI.Text('', attackStyle)
    this.attackText.anchor.set(0.5)
    this.attackText.y = attackY
    this.attackText.visible = false
    this.addChild(this.attackText)
  }
  
  updateHealth(health) {
    if (this.healthText) {
      this.healthText.text = `${health}`
    }
  }
  
  // Показать силу атаки (при выборе карт)
  showAttack(power) {
    if (power > 0) {
      this.attackText.text = `${power}`
      this.attackText.visible = true
      this.attackBg.visible = true
    } else {
      this.attackText.visible = false
      this.attackBg.visible = false
    }
  }

  /**
   * Освобождает ресурсы (особенно видео)
   */
  dispose() {
    if (this.videoEnemy) {
      this.videoEnemy.dispose()
      this.videoEnemy = null
    }
    super.dispose()
  }
}