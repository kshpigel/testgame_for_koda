import * as PIXI from 'pixi.js'
import { BlurFilter } from 'pixi.js'

/**
 * Анимация облаков на фоне (полупрозрачные, плывут по диагонали)
 * Генерируем текстуры с blur один раз при инициализации
 */
export class Clouds extends PIXI.Container {
  constructor(app, options = {}) {
    super()
    this.app = app
    this.count = options.count || 12
    this.speed = options.speed || 0.15
    this.clouds = []
    this.cloudTextures = []
    this.zIndex = 10
    
    // Включаем сортировку детей по zIndex
    this.sortableChildren = true
    
    this.generateCloudTextures(15)
    this.init()
  }

  // Генерируем текстуры облаков с blur один раз
  generateCloudTextures(count) {
    const renderTexture = PIXI.RenderTexture.create({ 
      width: 300,
      height: 150
    })
    
    for (let i = 0; i < count; i++) {
      const cloud = new PIXI.Graphics()
      const alpha = 0.15 + Math.random() * 0.15
      const color = 0xeeeeee
      
      // Рисуем облако
      cloud.beginFill(color, alpha)
      cloud.drawEllipse(0, 0, 60, 25)
      cloud.endFill()
      
      cloud.beginFill(color, alpha * 0.9)
      cloud.drawEllipse(-40, 5, 35, 18)
      cloud.drawEllipse(45, 3, 40, 20)
      cloud.endFill()
      
      cloud.beginFill(color, alpha * 0.8)
      cloud.drawEllipse(-20, -15, 25, 15)
      cloud.drawEllipse(20, -12, 28, 16)
      cloud.endFill()
      
      // Применяем blur
      const blurFilter = new BlurFilter(12)
      cloud.filters = [blurFilter]
      
      // Рендерим в текстуру
      cloud.position.set(150, 75)
      this.app.renderer.render(cloud, { renderTexture })
      
      // Создаём текстуру из renderTexture
      const texture = new PIXI.Texture(renderTexture)
      this.cloudTextures.push(texture)
      
      // Очищаем graphics
      cloud.destroy()
    }
    
    // Сохраняем renderTexture для destroy в конце
    this._renderTexture = renderTexture
  }

  init() {
    const screenW = this.app.screen.width || 1920
    const screenH = this.app.screen.height || 1080
    for (let i = 0; i < this.count; i++) {
      const texture = this.cloudTextures[i % this.cloudTextures.length]
      const cloud = new PIXI.Sprite(texture)
      cloud.anchor.set(0.5)
      
      // Начальная позиция
      cloud.x = Math.random() * screenW * 1.2
      cloud.y = Math.random() * screenH * 0.6
      
      // Движение по диагонали
      cloud.vx = -(this.speed + Math.random() * 0.1)
      cloud.vy = this.speed * 0.4 + Math.random() * 0.15
      
      // Размер
      cloud.scale.set(1.5 + Math.random() * 1.0)
      
      this.clouds.push(cloud)
      this.addChild(cloud)
    }
    
    this.app.ticker.add(this.update, this)
  }

  update = (delta) => {
    const screenW = this.app.screen.width || 1920
    const screenH = this.app.screen.height || 1080
    
    // Защита от NaN
    if (isNaN(screenW) || isNaN(screenH) || screenW <= 0 || screenH <= 0) {
      return
    }
    
    // Ограничиваем delta чтобы избежать бешеной скорости при лагах
    delta = Math.min(delta, 2)
    
    if (this.clouds.length === 0) {
      return
    }
    
    this.clouds.forEach(cloud => {
      cloud.x += cloud.vx * delta
      cloud.y += cloud.vy * delta
      
      // Проверка на NaN
      if (isNaN(cloud.x) || isNaN(cloud.y)) {
        cloud.x = Math.random() * screenW
        cloud.y = Math.random() * screenH
        return
      }
      
      // Увеличенные границы для больших облаков
      if (cloud.x < -300 || cloud.y > screenH + 150) {
        cloud.x = screenW + 50 + Math.random() * 200
        cloud.y = -150 - Math.random() * 80
        cloud.vx = -(this.speed + Math.random() * 0.1)
        cloud.vy = this.speed * 0.4 + Math.random() * 0.15
      }
    })
  }

  destroy(options) {
    // Защита от повторного destroy
    if (this._destroyed) return
    this._destroyed = true
    
    try {
      this.app.ticker.remove(this.update)
    } catch (e) {}
    
    this.clouds = []
    this.cloudTextures = []
    this._renderTexture = null
    
    // Уничтожаем сам контейнер
    super.destroy(options || { children: true })
  }
}