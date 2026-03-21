import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { config } from '../data/config.js'
import { addDebugBounds } from './ui_node.js'

export class EnemyDisplay {
  constructor(app, enemyData, assets) {
    this.app = app
    this.enemyData = enemyData
    this.assets = assets
    this.container = new PIXI.Container()
  }
  
  render() {
    this.renderEnemy()
    
    // Debug рамка
    const bounds = this.container.getBounds()
    addDebugBounds(this.container, bounds.width, bounds.height)
    
    return this.container
  }
  
  renderEnemy() {
    const enemyContainer = new PIXI.Container()
    enemyContainer.x = this.app.screen.width / 2
    enemyContainer.y = 280
    
    // Изображение врага
    const enemyMaxHeight = 286
    if (this.assets && this.assets.enemy && this.assets.enemy.texture) {
      const enemySprite = new PIXI.Sprite(this.assets.enemy.texture)
      enemySprite.anchor.set(0.5, 1)
      const scale = Math.min(1, enemyMaxHeight / enemySprite.texture.height)
      enemySprite.scale.set(scale)
      enemySprite.y = 0
      enemyContainer.addChild(enemySprite)
    } else if (this.enemyData.image) {
      const enemySprite = PIXI.Sprite.from(this.enemyData.image)
      enemySprite.anchor.set(0.5, 1)
      const scale = Math.min(1, enemyMaxHeight / enemySprite.texture.height)
      enemySprite.scale.set(scale)
      enemySprite.y = 0
      enemyContainer.addChild(enemySprite)
    }
    
    this.container.addChild(enemyContainer)
    
    // Имя врага с тенью
    const nameShadow = new PIXI.Text(this.enemyData.name, {
      fontFamily: FONT,
      fontSize: 40,
      fontWeight: 'bold',
      fill: '#000000'
    })
    nameShadow.anchor.set(0.5, 1)
    nameShadow.x = enemyContainer.x + 2
    nameShadow.y = 250 + 2
    this.container.addChild(nameShadow)
    
    const name = new PIXI.Text(this.enemyData.name, {
      fontFamily: FONT,
      fontSize: 40,
      fontWeight: 'bold',
      fill: colors.ui.text.primary
    })
    name.anchor.set(0.5, 1)
    name.x = enemyContainer.x
    name.y = 250
    this.container.addChild(name)
    
    // Здоровье врага
    const healthBg = new PIXI.Graphics()
    healthBg.lineStyle(1, colors.ui.text.primary)
    healthBg.beginFill(colors.ui.button.reset)
    healthBg.drawRoundedRect(enemyContainer.x - 115, 264, 230, 50, 14)
    healthBg.endFill()
    this.container.addChild(healthBg)
    
    const healthStyle = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 34,
      fontWeight: 'bold',
      fill: colors.ui.text.primary
    })
    this.healthText = new PIXI.Text('', healthStyle)
    this.healthText.anchor.set(0.5)
    this.healthText.x = enemyContainer.x
    this.healthText.y = 288
    this.container.addChild(this.healthText)
  }
  
  updateHealth(health) {
    if (this.healthText) {
      this.healthText.text = `${health}`
    }
  }
  
  getContainer() {
    return this.container
  }
}
