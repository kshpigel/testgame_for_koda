import * as PIXI from 'pixi.js'
import { config } from '../data/config.js'

export class Layout extends PIXI.Container {
  constructor(options = {}) {
    super()

    this.direction = options.direction || 'column'
    this.gap = options.gap || 0
    this.padding = options.padding || 0
    this.justify = options.justify || 'start'
    this._width = options.width || 'auto'
    this._height = options.height || 'auto'

    this._childrenData = new Map()
    this._container = new PIXI.Container()
    this.addChild(this._container)

    // Debug border
    if (config.debug) {
      this._debugBorder = new PIXI.Graphics()
      this.addChild(this._debugBorder)
    }

    this._containerWidth = 0
    this._containerHeight = 0
  }

  setSize(width, height) {
    this._width = width
    this._height = height
    this._layout()
  }

  add(child, options = {}) {
    const data = {
      flex: options.flex || 1,
      zIndex: options.zIndex ?? this._childrenData.size,
      stretch: options.stretch || false,
      ...options
    }

    this._childrenData.set(child, data)
    this._container.addChild(child)
    this._sortByZIndex()

    // Если есть anchor - сбрасываем в 0
    if (child.anchor && (child.anchor.x !== 0 || child.anchor.y !== 0)) {
      child.anchor = { x: 0, y: 0 }
    }

    // Ставим pivot по центру
    child.pivot.set((child.width || 0) / 2, (child.height || 0) / 2)

    // Если уже есть размеры - применим к child
    if (typeof this._width === 'number' && typeof this._height === 'number' && data.stretch) {
      if (child.setSize) {
        child.setSize(this._width, this._height / 3)
      }
    }

    this._layout()
  }

  remove(child) {
    this._childrenData.delete(child)
    this._container.removeChild(child)
    this._layout()
  }

  _sortByZIndex() {
    const children = Array.from(this._childrenData.entries())
    children.sort((a, b) => a[1].zIndex - b[1].zIndex)
    const sorted = children.map(([child]) => child)
    this._container.sortChildren = () => {
      sorted.forEach((child, i) => {
        child.zIndex = i
      })
    }
    this._container.sortChildren()
  }

  _layout() {
    const children = Array.from(this._childrenData.keys())
    if (children.length === 0) return

    const padding = this.padding
    const gap = this.gap
    const count = children.length

    let totalFlex = 0
    children.forEach(child => {
      totalFlex += this._childrenData.get(child).flex || 1
    })

    if (totalFlex === 0) {
      totalFlex = count
      children.forEach(child => {
        this._childrenData.get(child).flex = 1
      })
    }

    let containerW = typeof this._width === 'number' ? this._width : 0
    let containerH = typeof this._height === 'number' ? this._height : 0

    // Если размер 'auto' - вычисляем по детям
    if (this._width === 'auto' || this._height === 'auto') {
      children.forEach(child => {
        if (this._width === 'auto') {
          containerW = Math.max(containerW, child.width || 0)
        }
        if (this._height === 'auto') {
          containerH = Math.max(containerH, child.height || 0)
        }
      })
    }

    // Если задан конкретный размер (число) - используем его
    if (typeof this._width === 'number') containerW = this._width
    if (typeof this._height === 'number') containerH = this._height

    // Проверяем, есть ли stretch элементы
    let hasStretch = false
    children.forEach(child => {
      const data = this._childrenData.get(child)
      if (data.stretch) hasStretch = true
    })

    // Если есть stretch и задан числовой размер, используем его
    if (hasStretch) {
      if (typeof this._width === 'number') containerW = this._width
      if (typeof this._height === 'number') containerH = this._height
    }

    this._containerWidth = containerW
    this._containerHeight = containerH

    const availableWidth = containerW - padding * 2 - gap * (count - 1)
    const availableHeight = containerH - padding * 2 - gap * (count - 1)

    // Calculate content size
    let contentWidth = 0
    let contentHeight = 0

    children.forEach(child => {
      const data = this._childrenData.get(child)
      const flex = data.flex || 1
      const isFixed = flex === 0

      if (this.direction === 'row') {
        const w = isFixed ? (child.width || 0) : (availableWidth / totalFlex) * flex
        contentWidth += w
        // Для row с flex === 0 берём оригинальную высоту
        const h = isFixed ? (child.height || 0) : (containerH - padding * 2)
        contentHeight = Math.max(contentHeight, h)
      } else {
        // Для column: берём оригинальный размер ребёнка (не растянутый)
        const w = child.width || 0
        const h = child.height || 0
        contentWidth = Math.max(contentWidth, w)
        contentHeight += h + gap
      }
    })
    // Убираем последний gap
    contentHeight = Math.max(0, contentHeight - gap)

    // Debug log
    console.log('[Layout] _layout:', {
      _width: this._width,
      _height: this._height,
      direction: this.direction,
      justify: this.justify,
      containerW,
      containerH,
      contentW: Math.round(contentWidth),
      contentH: Math.round(contentHeight),
      children: children.map(c => ({
        flex: this._childrenData.get(c).flex,
        w: Math.round(c.width),
        h: Math.round(c.height),
        pivotX: c.pivot?.x || 0,
        pivotY: c.pivot?.y || 0
      }))
    })

    // Calculate start position
    let startX = padding
    let startY = padding

    if (this.justify === 'center') {
      // Для row: центрируем по горизонтали и вертикали
      if (this.direction === 'row') {
        let realContentW = 0
        let realContentH = 0
        children.forEach(child => {
          realContentW += child.width || 0
          realContentH = Math.max(realContentH, child.height || 0)
        })
        startX = (containerW - realContentW) / 2
        startY = (containerH - realContentH) / 2
      } else {
        // Для column: центрируем по вертикали
        let realContentW = 0
        let realContentH = 0
        children.forEach(child => {
          realContentW = Math.max(realContentW, child.width || 0)
          realContentH += child.height || 0
        })
        startX = (containerW - realContentW) / 2
        startY = (containerH - realContentH) / 2
      }
    } else if (this.justify === 'end') {
      if (this.direction === 'row') {
        startX = containerW - contentWidth - padding
      } else {
        startY = containerH - contentHeight - padding
      }
    }

    let offsetX = startX
    let offsetY = startY

    children.forEach(child => {
      const data = this._childrenData.get(child)
      const flex = data.flex
      const isFixed = flex === 0

      if (this.direction === 'row') {
        const childWidth = isFixed ? (child.width || 0) : (availableWidth / totalFlex) * flex
        // Для row с flex: 0 НЕ растягиваем по высоте
        const childHeight = isFixed ? (child.height || 0) : (containerH - padding * 2)

        const pivotX = child.pivot?.x || 0
        const pivotY = child.pivot?.y || 0

        // Центрируем по вертикали если есть anchor (anchor может быть числом или Point)
        const anchorY = typeof child.anchor === 'number' ? child.anchor : (child.anchor?.y || 0)
        let yPos = offsetY + pivotY
        if (anchorY > 0) {
          yPos = offsetY + pivotY + (childHeight - child.height) / 2
        }

        child.x = offsetX + pivotX
        child.y = yPos
        if (!isFixed) child.width = childWidth
        child.height = childHeight

        offsetX += childWidth + gap
      } else {
        const childWidth = containerW - padding * 2
        const childHeight = isFixed ? (child.height || 0) : (availableHeight / totalFlex) * flex

        const pivotX = child.pivot?.x || 0
        const pivotY = child.pivot?.y || 0

        // Центрируем по горизонтали если есть anchor
        const anchorX = typeof child.anchor === 'number' ? child.anchor : (child.anchor?.x || 0)
        let xPos = offsetX + pivotX
        if (anchorX > 0) {
          xPos = offsetX + pivotX + (childWidth - child.width) / 2
        }

        child.x = xPos
        child.y = offsetY + pivotY

        if (!isFixed) child.width = childWidth
        if (!isFixed) child.height = childHeight

        offsetY += childHeight + gap
      }

      if (child.resize) {
        child.resize(child.width, child.height)
      }
    })

    this._drawDebugBorder()
  }

  removeAll() {
    this._childrenData.clear()
    this._container.removeChildren()
  }

  get width() {
    return this._containerWidth
  }

  get height() {
    return this._containerHeight
  }

  _drawDebugBorder() {
    if (!config.debug || !this._debugBorder) return

    this._debugBorder.clear()
    const w = this._containerWidth
    const h = this._containerHeight
    const t = 4

    // Top - red
    this._debugBorder.beginFill(0xff0000, 1)
    this._debugBorder.drawRect(0, 0, w, t)
    this._debugBorder.endFill()

    // Bottom - blue
    this._debugBorder.beginFill(0x0000ff, 1)
    this._debugBorder.drawRect(0, h - t, w, t)
    this._debugBorder.endFill()

    // Left - green
    this._debugBorder.beginFill(0x00ff00, 1)
    this._debugBorder.drawRect(0, 0, t, h)
    this._debugBorder.endFill()

    // Right - yellow
    this._debugBorder.beginFill(0xffff00, 1)
    this._debugBorder.drawRect(w - t, 0, t, h)
    this._debugBorder.endFill()
  }
}