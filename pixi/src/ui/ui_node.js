import * as PIXI from 'pixi.js'
import { config, log } from '../data/config.js'

// Базовый класс для всех UI элементов
// Рисует рамку в debug режиме
export class UINode extends PIXI.Container {
  constructor(options = {}) {
    super()
    
    this._width = options.width || 0
    this._height = options.height || 0
    this._debugColor = 0xFF00FF // magenta
    
    // Подписываемся на изменения debug
    this._debugDirty = true
  }

  get width() { return this._width }
  get height() { return this._height }

  set width(v) { 
    this._width = v
    this._debugDirty = true
  }

  set height(v) { 
    this._height = v
    this._debugDirty = true
  }

  // Переопределить в потомках для расчёта размеров
  calculateSize() {
    // По умолчанию - bounds дочерних элементов
    if (this.children.length > 0) {
      const bounds = this.getBounds()
      this._width = bounds.width
      this._height = bounds.height
    }
  }

  // Отрисовка debug рамки
  drawDebugFrame() {
    // Удаляем старый debug контейнер
    const oldDebug = this.getChildByName('debugFrame')
    if (oldDebug) {
      this.removeChild(oldDebug)
    }

    // Рисуем только если есть размеры и debug включен
    if ((this._width > 0 || this._height > 0) && config.debug) {
      const debug = new PIXI.Graphics()
      debug.name = 'debugFrame'
      
      // Рамка
      debug.lineStyle(2, this._debugColor, 1)
      debug.drawRect(0, 0, this._width, this._height)
      
      // Центр
      debug.lineStyle(1, this._debugColor, 0.5)
      debug.moveTo(this._width / 2, 0)
      debug.lineTo(this._width / 2, this._height)
      debug.moveTo(0, this._height / 2)
      debug.lineTo(this._width, this._height / 2)
      
      this.addChild(debug)
    }
    
    this._debugDirty = false
  }

  // Вызывать после изменения размеров или при show()
  updateDebug() {
    if (this._debugDirty || config.debug) {
      this.drawDebugFrame()
    }
  }

  // Очистка debug рамки
  clearDebug() {
    const oldDebug = this.getChildByName('debugFrame')
    if (oldDebug) {
      this.removeChild(oldDebug)
    }
  }
}

// Утилита для создания debug рамки на любом container
export function addDebugBounds(container, width, height, color = 0xFF00FF) {
  if (!config.debug) return
  
  const debug = new PIXI.Graphics()
  debug.name = 'debugBounds'
  debug.lineStyle(2, color, 1)
  debug.drawRect(0, 0, width, height)
  container.addChild(debug)
}
