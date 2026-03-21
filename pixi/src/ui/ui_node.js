import * as PIXI from 'pixi.js'
import { config, log } from '../data/config.js'
import { Z } from '../data/z_index.js'

// Базовый класс для всех UI элементов
// - Единая система координат (pivot по центру)
// - Автоматические debug рамки
// - Универсальный sizing
export class UINode extends PIXI.Container {
  constructor(options = {}) {
    super()
    
    this._width = options.width || 0
    this._height = options.height || 0
    this._debugColor = options.debugColor || 0xFF00FF // magenta
    
    // Scale анимация
    this._scale = 1
    this._targetScale = 1
    this._scaleSpeed = options.scaleSpeed || 0.2
    
    // Pivot по умолчанию - по центру
    if (this._width > 0) this.pivot.x = this._width / 2
    if (this._height > 0) this.pivot.y = this._height / 2
    
    this._debugDirty = true
    this._app = options.app || null
    this._visualX = 0
    this._visualY = 0
    
    // Auto zIndex - по умолчанию UI слой
    // Можно переопределить через options.zIndex или options.layer
    if (options.zIndex !== undefined) {
      this.zIndex = options.zIndex
    } else if (options.layer === 'bg') {
      this.zIndex = Z.getBg()
    } else if (options.layer === 'gameObject') {
      this.zIndex = Z.getGameObject()
    } else {
      this.zIndex = Z.getUi()
    }
    
    // Подключаем tick если есть app
    if (this._app) {
      this._app.ticker.add(this.updateScale, this)
    }
  }

  get width() { return this._width }
  get height() { return this._height }

  set width(v) { 
    this._width = v
    this.pivot.x = v / 2
    this._debugDirty = true
  }

  set height(v) { 
    this._height = v
    this.pivot.y = v / 2
    this._debugDirty = true
  }
  
  get scaleValue() { return this._scale }
  set scaleValue(v) { this.setScale(v) }
  
  // Установить целевой scale для анимации
  setScale(v) {
    this._targetScale = v
    this._debugDirty = true
  }
  
  // Обновление scale (вызывается из ticker)
  updateScale() {
    const diff = Math.abs(this._scale - this._targetScale)
    if (diff > 0.001) {
      this._scale += (this._targetScale - this._scale) * this._scaleSpeed
      this.scale.set(this._scale)
    } else if (diff > 0.0001) {
      this._scale = this._targetScale
      this.scale.set(this._scale)
    }
    
    // Компенсируем смещение при scale - пересчитываем позицию
    if (this._visualX !== undefined && Math.abs(this._scale - 1) > 0.001) {
      const scaleRatio = this._scale
      // Позиция с учётом scale должна быть: визуальная позиция + компенсация
      this.x = this._visualX + this.pivot.x * scaleRatio
      this.y = this._visualY + this.pivot.y * scaleRatio
    }
  }
  
  // Установить размеры и обновить pivot
  setSize(width, height) {
    this._width = width
    this._height = height
    this.pivot.set(width / 2, height / 2)
    this._debugDirty = true
  }
  
  // Позиционирование с учётом pivot (стандарт для всех UINode)
  setX(v) { 
    this._visualX = v
    this.x = v + this.pivot.x
  }
  setY(v) { 
    this._visualY = v
    this.y = v + this.pivot.y
  }

  // Отрисовка debug рамки
  drawDebugFrame() {
    // Удаляем старый debug контейнер
    const oldDebug = this.getChildByName('debugFrame')
    if (oldDebug) {
      this.removeChild(oldDebug)
    }
    const oldZIndex = this.getChildByName('debugZIndex')
    if (oldZIndex) {
      this.removeChild(oldZIndex)
    }

    // Рисуем только если есть размеры и debug включен
    if ((this._width > 0 || this._height > 0) && config.debug) {
      const debug = new PIXI.Graphics()
      debug.name = 'debugFrame'
      
      // Рамка от центра (с учетом pivot)
      const x = -this._width / 2
      const y = -this._height / 2
      
      debug.lineStyle(2, this._debugColor, 1)
      debug.drawRect(x, y, this._width, this._height)
      
      // Центр (крест)
      debug.lineStyle(1, this._debugColor, 0.5)
      debug.moveTo(0, y)
      debug.lineTo(0, y + this._height)
      debug.moveTo(x, 0)
      debug.lineTo(x + this._width, 0)
      
      this.addChild(debug)
      
      // zIndex текст в правом верхнем углу (за пределами бордера)
      const zIndexText = new PIXI.Text(`${this.zIndex}`, {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: this._debugColor
      })
      zIndexText.name = 'debugZIndex'
      zIndexText.anchor.set(0, 0)
      zIndexText.x = x + this._width + 5
      zIndexText.y = y - 2
      this.addChild(zIndexText)
    }
    
    this._debugDirty = false
  }

  // Вызвать после создания/изменения размеров
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
    const oldZIndex = this.getChildByName('debugZIndex')
    if (oldZIndex) {
      this.removeChild(oldZIndex)
    }
  }
  
  // Очистка (удаление из ticker)
  destroy(options) {
    if (this._app) {
      this._app.ticker.remove(this.updateScale, this)
    }
    super.destroy(options)
  }
}

// Утилита для создания debug рамки на любом container
export function addDebugBounds(container, width, height, color = 0xFF00FF) {
  if (!config.debug) return
  
  // Удаляем старую рамку
  const old = container.getChildByName('debugBounds')
  if (old) container.removeChild(old)
  
  const debug = new PIXI.Graphics()
  debug.name = 'debugBounds'
  debug.lineStyle(2, color, 1)
  
  // Учитываем pivot - рисуем от центра
  const x = container.pivot.x !== 0 ? -container.pivot.x : -width / 2
  const y = container.pivot.y !== 0 ? -container.pivot.y : -height / 2
  
  debug.drawRect(x, y, width, height)
  
  // Центр
  debug.lineStyle(1, color, 0.5)
  debug.moveTo(0, y)
  debug.lineTo(0, y + height)
  debug.moveTo(x, 0)
  debug.lineTo(x + width, 0)
  
  container.addChild(debug)
}