import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { UINode } from './ui_node.js'

export class EnemyDisplay extends UINode {
  constructor(app, enemyData, assets) {
    super({
      width: 300,
      height: 350,
      app: app
    })
    
    this.enemyData = enemyData
    this.assets = assets
    
    this.create()
    this.updateDebug()
  }
  
  create() {
    // Позиции относительно центра (благодаря UINode pivot по центру)
    const enemyY = 0
    const nameY = -30
    const healthY = 60
    
    // Изображение врага
    const enemyMaxHeight = 286
    if (this.assets && this.assets.enemy && this.assets.enemy.texture) {
      const enemySprite = new PIXI.Sprite(this.assets.enemy.texture)
      enemySprite.anchor.set(0.5, 1)
      const scale = Math.min(1, enemyMaxHeight / enemySprite.texture.height)
      enemySprite.scale.set(scale)
      enemySprite.y = enemyY + 50
      this.addChild(enemySprite)
    } else if (this.enemyData.image) {
      const enemySprite = PIXI.Sprite.from(this.enemyData.image)
      enemySprite.anchor.set(0.5, 1)
      const scale = Math.min(1, enemyMaxHeight / enemySprite.texture.height)
      enemySprite.scale.set(scale)
      enemySprite.y = enemyY + 50
      this.addChild(enemySprite)
    }
    
    // Имя врага с тенью
    const nameShadow = new PIXI.Text(this.enemyData.name, {
      fontFamily: FONT,
      fontSize: 40,
      fontWeight: 'bold',
      fill: '#000000'
    })
    nameShadow.anchor.set(0.5, 1)
    nameShadow.x = 2
    nameShadow.y = nameY + 2
    this.addChild(nameShadow)
    
    const name = new PIXI.Text(this.enemyData.name, {
      fontFamily: FONT,
      fontSize: 40,
      fontWeight: 'bold',
      fill: colors.ui.text.primary
    })
    name.anchor.set(0.5, 1)
    name.y = nameY
    this.addChild(name)
    
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
  }
  
  updateHealth(health) {
    if (this.healthText) {
      this.healthText.text = `${health}`
    }
  }
}