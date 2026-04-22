import * as PIXI from 'pixi.js'
import { colors } from '../data/colors.js'
import { FONT } from '../data/fonts.js'

export class ToastManager {
  constructor(app, parentContainer, options = {}) {
    this.app = app
    this.container = new PIXI.Container()
    this.container.zIndex = options.zIndex || 999998
    this.container.sortableChildren = true
    parentContainer.addChild(this.container)
    
    if (parentContainer && !parentContainer.sortableChildren) {
      parentContainer.sortableChildren = true
    }
    
    this.maxVisible = options.maxVisible || 3
    this.duration = options.duration || 3000
    this.marginTop = options.marginTop || 0
    this.marginRight = 0
    this.gap = options.gap || 10
    this.maxWidth = options.maxWidth || 300
    this.paddingTop = 10
    
    this.types = {
      green: {
        bg: colors.card?.background?.selected || 0x4a7c4a,
        border: colors.card?.border?.selected || 0x4a9c6d,
        text: colors.card?.border?.white || 0xF5E7CF
      },
      red: {
        bg: colors.enemy?.ring?.boss || 0x8c1300,
        border: colors.enemy?.ring?.very_strong || 0xa83200,
        text: colors.card?.border?.white || 0xF5E7CF
      },
      purple: {
        bg: colors.card?.circle?.debuff?.center || 0x8a2791,
        border: colors.card?.circle?.debuff?.edge || 0x3B0C32,
        text: colors.card?.border?.white || 0xF5E7CF
      }
    }
    
    this.queue = []
    this.activeToasts = []
    
    this._tickerCallback = (ticker) => this.update(ticker)
    this.app.ticker.add(this._tickerCallback)
  }
  
  show(message, type = 'green', duration = null) {
    const toast = this.createToast(message, type, duration || this.duration)
    if (!toast) return
    
    // Если очередь переполнена (более 10), удаляем самые старые
    if (this.queue.length >= 10) {
      const oldToast = this.queue.shift()
      if (oldToast && oldToast.parent) {
        oldToast.parent.removeChild(oldToast)
        oldToast.destroy({ children: true })
      }
    }
    
    this.queue.push(toast)
    this.processQueue()
  }
  
  createToast(message, type, duration) {
    if (!this.types || !this.types.green) return null
    
    const config = this.types[type] || this.types.green
    const toast = new PIXI.Container()
    
    toast.cursor = 'pointer'
    toast.type = type
    toast.duration = duration
    toast.isRemoving = false
    toast.isAnimatingIn = true
    toast.isAnimatingOut = false
    toast.scale.set(1)
    toast.pivot.set(0, 0)
    
    const closeBtn = this.createCloseButton(toast)
    toast.closeBtn = closeBtn
    
    const text = new PIXI.Text(message, {
      fontFamily: FONT || 'Arial',
      fontSize: 14,
      fill: config.text || 0xF5E7CF,
      wordWrap: true,
      wordWrapWidth: this.maxWidth - 50
    })
    toast.text = text
    
    const textWidth = text.width || 100
    const textHeight = text.height || 20
    const paddingX = 15
    const paddingY = 5
    const closeBtnWidth = 12
    const closeBtnHeight = closeBtn.height || 12
    const closeBtnX = paddingX
    const textX = closeBtnX + closeBtnWidth + 5
    const totalWidth = Math.min(textX + textWidth + paddingX, this.maxWidth)
    const totalHeight = Math.max(Math.max(textHeight, closeBtnHeight + this.paddingTop) + paddingY, 30)
    
    toast.width = totalWidth
    toast.height = totalHeight
    
    const bg = new PIXI.Graphics()
    const r = 15
    
    bg.beginFill(config.bg)
    bg.moveTo(r, 0)
    bg.lineTo(totalWidth, 0)
    bg.lineTo(totalWidth, totalHeight)
    bg.lineTo(r, totalHeight)
    bg.quadraticCurveTo(0, totalHeight, 0, totalHeight - r)
    bg.lineTo(0, r)
    bg.quadraticCurveTo(0, 0, r, 0)
    bg.endFill()
    
    toast.addChild(bg, closeBtn, text)
    
    closeBtn.x = closeBtnX
    closeBtn.y = this.paddingTop
    text.x = textX
    text.y = paddingY
    
    toast.x = this.app.screen.width + 50
    toast.y = this.marginTop
    
    toast.on('pointerdown', function(e) {
      e.stopPropagation()
      if (!this.isRemoving && this._manager) {
        this._manager.removeToast(this)
      }
    })
    toast._manager = this
    
    return toast
  }
  
  createCloseButton(toast) {
    const btn = new PIXI.Container()
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    btn.hitArea = new PIXI.Rectangle(0, 0, 12, 12)
    
    const size = 12
    const xGraphics = new PIXI.Graphics()
    xGraphics.eventMode = 'static'
    xGraphics.cursor = 'pointer'
    xGraphics.lineStyle(4, colors.card.border.white)
    xGraphics.moveTo(0, 0)
    xGraphics.lineTo(size, size)
    xGraphics.moveTo(size, 0)
    xGraphics.lineTo(0, size)
    
    btn.addChild(xGraphics)
    btn.width = size
    btn.height = size
    
    btn.on('pointerdown', (e) => {
      e.stopPropagation()
      if (toast && !toast.isRemoving) {
        this.removeToast(toast)
      }
    })
    
    return btn
  }
  
  processQueue() {
    if (this.queue.length === 0) return
    
    if (this.activeToasts.length < this.maxVisible) {
      const toast = this.queue.shift()
      this.activeToasts.push(toast)
      this.container.addChild(toast)
      
      const screenWidth = this.app.screen.width
      const screenHeight = this.app.screen.height
      const targetX = screenWidth - toast.width - this.marginRight
      
      toast.x = screenWidth + 50
      toast.targetX = targetX
      toast.waitStart = Date.now()
      
      this.repositionToasts()
    }
  }
  
  removeToast(toast) {
    if (!toast || toast.isRemoving) return
    toast.isRemoving = true
    toast.isAnimatingOut = true
  }
  
  destroyToast(toast) {
    const index = this.activeToasts.indexOf(toast)
    if (index > -1) this.activeToasts.splice(index, 1)
    if (toast.parent) toast.parent.removeChild(toast)
    toast.destroy({ children: true })
  }
  
  update(ticker) {
    const dt = (ticker?.delta || 1) / 60
    const now = Date.now()
    
    for (let i = this.activeToasts.length - 1; i >= 0; i--) {
      const toast = this.activeToasts[i]
      if (!toast) continue
      
      if (toast.waitStart && !toast.isRemoving) {
        const elapsed = now - toast.waitStart
        if (elapsed >= toast.duration) {
          this.removeToast(toast)
        }
      }
      
      if (toast.isAnimatingIn && toast.targetX) {
        const dx = toast.targetX - toast.x
        if (Math.abs(dx) > 1) {
          toast.x += dx * 0.15
        } else {
          toast.x = toast.targetX
          toast.isAnimatingIn = false
        }
      }
      
      if (toast.isAnimatingOut) {
        const toastWidth = toast.width || 100
        const slideSpeed = 500 * dt
        toast.x += slideSpeed
        
        if (toast.x > this.app.screen.width + 50) {
          this.destroyToast(toast)
          this.repositionToasts()
          this.processQueue()
        }
      }
    }
  }
  
  repositionToasts() {
    const nonAnimatingToasts = this.activeToasts.filter(t => !t.isAnimatingOut)
    if (nonAnimatingToasts.length === 0) return
    
    const totalHeight = nonAnimatingToasts.reduce((sum, t) => sum + t.height + this.gap, 0) - this.gap
    const startY = (this.app.screen.height / 2) - (totalHeight / 2)
    
    let y = startY
    for (const toast of nonAnimatingToasts) {
      toast.y = y
      y += toast.height + this.gap
    }
  }
  
  clear() {
    for (const toast of this.activeToasts) {
      toast.destroy({ children: true })
    }
    this.activeToasts = []
  }
  
  destroy() {
    this.clear()
    if (this._tickerCallback) {
      this.app.ticker.remove(this._tickerCallback)
    }
    this.container.destroy({ children: true })
  }
}

export let toastManager = null

export function initToastManager(app, parentContainer) {
  toastManager = new ToastManager(app, parentContainer)
  return toastManager
}
