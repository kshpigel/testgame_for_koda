import * as PIXI from 'pixi.js'
import { BlurFilter } from 'pixi.js'

/**
 * Анимация облаков на фоне (полупрозрачные, плывут по диагонали)
 * Генерируем текстуры с blur один раз при инициализации
 */
export class Clouds {
  constructor(app, options = {}) {
    this.app = app
    this.count = options.count || 12 // Увеличено с 6 до 12
    this.speed = options.speed || 0.15
    this.clouds = []
    this.container = new PIXI.Container()
    this.container.zIndex = 10
    
    this.cloudTextures = []
    this.generateCloudTextures(15) // Увеличено с 10 до 15 для разнообразия
    this.init()
  }

  // Генерируем текстуры облаков с blur один раз
  generateCloudTextures(count) {
    const renderTexture = PIXI.RenderTexture.create({ 
      width: 300, // Увеличено с 200 до 300
      height: 150 // Увеличено с 100 до 150
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
      
      // Применяем blur (уменьшено с 25 до 12)
      const blurFilter = new BlurFilter(12)
      cloud.filters = [blurFilter]
      
      // Рендерим в текстуру
      cloud.position.set(150, 75) // Центр нового размера
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
    for (let i = 0; i < this.count; i++) {
      const texture = this.cloudTextures[i % this.cloudTextures.length]
      const cloud = new PIXI.Sprite(texture)
      cloud.anchor.set(0.5)
      
      // Начальная позиция
      cloud.x = Math.random() * this.app.screen.width * 1.2
      cloud.y = Math.random() * this.app.screen.height * 0.6
      
      // Движение по диагонали
      cloud.vx = -(this.speed + Math.random() * 0.1)
      cloud.vy = this.speed * 0.4 + Math.random() * 0.15
      
      // Размер (увеличено x2.5)
      cloud.scale.set(1.5 + Math.random() * 1.0) // 1.5-2.5 вместо 1.0-1.5
      
      this.clouds.push(cloud)
      this.container.addChild(cloud)
    }
    
    this.app.ticker.add(this.update)
  }

  update = (delta) => {
    const screenW = this.app.screen.width
    const screenH = this.app.screen.height
    
    this.clouds.forEach(cloud => {
      cloud.x += cloud.vx * delta
      cloud.y += cloud.vy * delta
      
      // Увеличенные границы для больших облаков
      if (cloud.x < -300 || cloud.y > screenH + 150) {
        cloud.x = screenW + 50 + Math.random() * 200 // Больше случайности по X
        cloud.y = -150 - Math.random() * 80
        cloud.vx = -(this.speed + Math.random() * 0.1)
        cloud.vy = this.speed * 0.4 + Math.random() * 0.15
      }
    })
  }

  destroy() {
    // Защита от повторного destroy
    if (this._destroyed) return
    this._destroyed = true
    
    try {
      this.app.ticker.remove(this.update)
    } catch (e) {}
    
    // Сначала очищаем clouds массив (спрайты)
    if (this.clouds) {
      this.clouds = []
    }
    
    // Удаляем children из container вручную
    if (this.container && this.container.children) {
      const children = this.container.children.slice()
      children.forEach(child => {
        try {
          this.container.removeChild(child)
        } catch (e) {}
      })
    }
    
    // Уничтожаем container
    try {
      if (this.container) {
        this.container.destroy({ children: true })
        this.container = null
      }
    } catch (e) {
      console.warn('[Clouds] container.destroy error:', e)
    }
    
    // Текстуры НЕ уничтожаем здесь - они создаются из renderTexture один раз
    // и могут использоваться в других местах (хотя в данном случае нет)
    this.cloudTextures = []
    this._renderTexture = null
  }
}
