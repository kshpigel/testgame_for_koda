import * as PIXI from 'pixi.js'

/**
 * Анимация птиц на фоне (галочка, 5-7px, по диагонали)
 * Без спрайтов - рисуем через Graphics
 */
export class Birds {
  constructor(app, options = {}) {
    this.app = app
    this.count = options.count || 4
    this.speed = options.speed || 0.8
    this.birds = []
    this.container = new PIXI.Container()
    
    this.init()
  }

  init() {
    for (let i = 0; i < this.count; i++) {
      const bird = this.createBird()
      
      // Начальная позиция - случайно по экрану
      bird.x = Math.random() * this.app.screen.width
      bird.y = Math.random() * (this.app.screen.height * 0.4) // В верхней части
      
      // Скорость с небольшим разбросом
      bird.vx = -(this.speed + Math.random() * 0.4)
      bird.vy = this.speed * 0.3 + Math.random() * 0.2
      
      // Размер птицы (5-7px)
      bird.baseScale = 0.8 + Math.random() * 0.4
      bird.scale.set(bird.baseScale)
      
      // Анимация крыльев
      bird.wingPhase = Math.random() * Math.PI * 2
      bird.wingSpeed = 0.15 + Math.random() * 0.1
      
      this.birds.push(bird)
      this.container.addChild(bird)
    }
    
    // Подписка на ticker
    this.app.ticker.add(this.update)
  }

  createBird() {
    const bird = new PIXI.Graphics()
    const size = 5 + Math.random() * 2 // 5-7px от центра до конца крыла
    
    // Рисуем птицу "галочкой" с анимацией махания
    const draw = (wingOffset) => {
      bird.clear()
      bird.lineStyle(1.5, 0x1a1a1a, 0.9)
      
      // Левое крыло - опускается/поднимается
      const leftY = wingOffset * size * 0.8
      bird.moveTo(0, 0)
      bird.lineTo(-size, leftY - size * 0.5)
      
      // Правое крыло - зеркально
      bird.moveTo(0, 0)
      bird.lineTo(size, leftY - size * 0.5)
    }
    
    // Начальная отрисовка
    draw(0)
    bird.draw = draw
    
    return bird
  }

  update = (delta) => {
    const screenW = this.app.screen.width
    const screenH = this.app.screen.height
    
    this.birds.forEach(bird => {
      // Движение по диагонали
      bird.x += bird.vx * delta
      bird.y += bird.vy * delta
      
      // Анимация крыльев (взмах вверх-вниз)
      bird.wingPhase += bird.wingSpeed * delta
      const wingOffset = Math.sin(bird.wingPhase) // от -1 до 1
      bird.draw(wingOffset)
      
      // Если птица улетела за левый или нижний край - перемещаем наверх-вправо
      if (bird.x < -20 || bird.y > screenH + 20) {
        bird.x = screenW + 20 + Math.random() * 100
        bird.y = -20 - Math.random() * 50
      }
    })
  }

  destroy() {
    // Защита от повторного destroy
    if (this._destroyed) return
    this._destroyed = true
    
    this.app.ticker.remove(this.update)
    
    // Удаляем все bird Graphics из контейнера вручную
    this.birds.forEach(bird => {
      if (bird && this.container.children.includes(bird)) {
        this.container.removeChild(bird)
      }
    })
    this.birds = []
    
    // Теперь уничтожаем container
    if (this.container) {
      this.container.destroy({ children: true })
    }
  }
}
