import * as PIXI from 'pixi.js'
import { colors } from '../data/colors.js'
import { config } from '../data/config.js'
import { FONT } from '../data/fonts.js'

export class MapRenderer {
  constructor(app, mapData, assets) {
    this.app = app
    this.mapData = mapData
    this.assets = assets
    
    this.container = new PIXI.Container()
  }
  
  render() {
    this.renderBackground()
    this.renderTitle()
    this.renderGrid()
    return this.container
  }
  
  renderBackground() {
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
  }
  
  renderTitle() {
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
  
  scaleToCover(sprite, targetWidth, targetHeight) {
    const scaleX = targetWidth / sprite.texture.width
    const scaleY = targetHeight / sprite.texture.height
    const scale = Math.max(scaleX, scaleY)
    sprite.scale.set(scale)
    sprite.x = (targetWidth - sprite.texture.width * scale) / 2
    sprite.y = (targetHeight - sprite.texture.height * scale) / 2
  }
  
  getContainer() {
    return this.container
  }
}
