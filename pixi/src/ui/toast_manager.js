import * as PIXI from 'pixi.js'
import { EventEmitter } from 'events'
import { colors } from '../data/colors.js'
import { FONT } from '../data/fonts.js'

/**
 * Менеджер всплывающих уведомлений (Toast Notifications)
 * Выводит уведомления справа сверху с анимацией выезда
 * 
 * Использование:
 * toastManager.show('Сообщение', 'green')
 * toastManager.show('Ошибка!', 'red')
 * toastManager.show('Спец. награда', 'purple')
 */
export class ToastManager {
  constructor(app, parentContainer, options = {}) {
    this.app = app
    this.container = new PIXI.Container()
    this.container.zIndex = options.zIndex || 999998
    this.container.sortableChildren = true
    // Убрали eventMode = 'none' — теперь дети (кнопки) могут получать клики
    parentContainer.addChild(this.container)
    
    console.log('[ToastManager] created, parentContainer:', parentContainer, 'zIndex:', this.container.zIndex)
    
    // Конфигурация
    this.maxVisible = options.maxVisible || 3
    this.duration = options.duration || 3000
    this.marginTop = options.marginTop || 20
    this.marginRight = 0 // Убран отступ справа
    this.gap = options.gap || 10
    this.maxWidth = options.maxWidth || 300
    this.paddingTop = 10 // Отступ сверху для крестика (10px)
    
    // Конфигурация типов уведомлений - все цвета из colors.js с fallback
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
        bg: colors.card?.circle?.selected?.center || 0xEE40D7,
        border: colors.card?.circle?.selected?.edge || 0x3B0C32,
        text: colors.card?.border?.white || 0xF5E7CF
      }
    }
    
    this.queue = []
    this.activeToasts = []
    
    // Тикер для анимаций
    this._tickerCallback = (ticker) => this.update(ticker)
    this.app.ticker.add(this._tickerCallback)
  }
  
  // Получить ширину экрана (используем renderer.screen для точности)
  getScreenWidth() {
    return this.app.screen.width
  }
  
  /**
   * Показать уведомление
   * @param {string} message - текст сообщения
   * @param {string} type - 'green' | 'red' | 'purple'
   * @param {number} duration - время показа в мс (переопределяет дефолт)
   */
  show(message, type = 'green', duration = null) {
    console.log('[ToastManager.show] message:', message, 'type:', type)
    const toast = this.createToast(message, type, duration || this.duration)
    if (!toast) {
      console.error('[ToastManager.show] toast creation failed!')
      return
    }
    this.queue.push(toast)
    this.processQueue()
  }
  
  createToast(message, type, duration) {
    if (!this.types || !this.types.green) {
      console.error('[ToastManager.createToast] this.types not initialized!')
      return null
    }
    const config = this.types[type] || this.types.green
    console.log('[ToastManager.createToast] config:', config, 'FONT:', FONT)
    
    // Контейнер уведомления
    const toast = new PIXI.Container()
    // Убрали eventMode - клики обрабатываются детьми (closeBtn и текст)
    toast.cursor = 'pointer'
    toast.type = type
    toast.duration = duration
    toast.elapsed = 0
    toast.isRemoving = false
    toast.scale.set(1)
    toast.pivot.set(0, 0)
    
    // Кнопка закрытия (X) - БЕЗ фона, с обработчиком закрытия
    const closeBtn = this.createCloseButton(() => this.removeToast(toast))
    toast.closeBtn = closeBtn
    console.log('[ToastManager.createToast] closeBtn created, height:', closeBtn?.height)
    
    // Текст (font-size: 14px)
    const text = new PIXI.Text(message, {
      fontFamily: FONT || 'Arial',
      fontSize: 14,
      fill: config.text || 0xF5E7CF,
      wordWrap: true,
      wordWrapWidth: this.maxWidth - 50
    })
    toast.text = text
    console.log('[ToastManager.createToast] text created, text:', text, 'text.width:', text?.width)
    
    // Размеры (padding: 5px 15px)
    const textWidth = text.width || 100
    const textHeight = text.height || 20
    const paddingX = 15
    const paddingY = 5
    const closeBtnWidth = 12
    const closeBtnHeight = closeBtn.height || 12
    const closeBtnX = paddingX
    const textX = closeBtnX + closeBtnWidth + 5 // X + ширина кнопки + отступ
    const totalWidth = Math.min(textX + textWidth + paddingX, this.maxWidth)
    const totalHeight = Math.max(Math.max(textHeight, closeBtnHeight + this.paddingTop) + paddingY, 30)
    
    toast.width = totalWidth
    toast.height = totalHeight
    
    // Фон с border-radius: 15px 0 0 15px (только левые углы)
    const bg = new PIXI.Graphics()
    const r = 15 // радиус для левого верхнего и левого нижнего
    
    bg.beginFill(config.bg) // фон = цвет бордера
    bg.moveTo(r, 0)
    bg.lineTo(totalWidth, 0)
    bg.lineTo(totalWidth, totalHeight)
    bg.lineTo(r, totalHeight)
    bg.quadraticCurveTo(0, totalHeight, 0, totalHeight - r)
    bg.lineTo(0, r)
    bg.quadraticCurveTo(0, 0, r, 0)
    bg.endFill()
    
    toast.addChild(bg, closeBtn, text)
    
    // Позиция кнопки X
    closeBtn.x = closeBtnX
    // closeBtn.y уже установлен в createCloseButton (this.paddingTop = 10)
    
    // Позиция текста (после кнопки X)
    text.x = textX
    text.y = paddingY
    
    // Начальная позиция (справа, за экраном)
    toast.x = this.app.screen.width + 50
    toast.y = this.marginTop
    
    // Закрытие по клику на всё уведомление
    toast.on('pointerdown', () => {
      if (!toast.isRemoving) {
        this.removeToast(toast)
      }
    })
    
    console.log('[ToastManager.createToast] toast created successfully, returning')
    return toast
  }
  
  createCloseButton(onClick) {
    const btn = new PIXI.Container()
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    
    // HitArea для кнопки (прямоугольник 12x12)
    btn.hitArea = new PIXI.Rectangle(0, 0, 12, 12)
    
    // Рисуем X через Graphics
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
    btn.y = this.paddingTop
    
    // Обработчик на контейнер
    btn.on('pointerdown', (e) => {
      console.log('[ToastManager] Крестик клик!')
      e.stopPropagation()
      if (onClick) onClick()
    })
    
    return btn
  }
  
  processQueue() {
    if (this.queue.length === 0) {
      console.log('[ToastManager.processQueue] queue empty')
      return
    }
    
    if (this.activeToasts.length < this.maxVisible) {
      const toast = this.queue.shift()
      this.activeToasts.push(toast)
      this.container.addChild(toast)
      
      // Принудительная перерисовка
      this.app.renderer.render(this.app.stage)
      
      // Правильная позиция: справа, прижато к краю
      const screenWidth = this.app.screen.width
      const targetX = screenWidth - toast.width - this.marginRight
      console.log('[ToastManager.processQueue] added toast, active:', this.activeToasts.length, 'toast.width:', toast.width, 'screen.width:', screenWidth, 'targetX:', targetX)
      
      toast.x = targetX
      toast.y = this.marginTop + (this.activeToasts.length - 1) * (toast.height + this.gap)
      
      // Принудительная перерисовка после позиционирования
      this.app.renderer.render(this.app.stage)
      
      // Начать таймер удаления
      toast.waitStart = Date.now()
      
      // Автоматическое удаление через duration
      setTimeout(() => this.removeToast(toast), toast.duration || this.duration)
    } else {
      console.log('[ToastManager.processQueue] max visible reached, waiting')
    }
  }
  
  removeToast(toast) {
    if (!toast || toast.isRemoving) return
    toast.isRemoving = true
    
    console.log('[ToastManager.removeToast] removing toast')
    
    // Удаляем из activeToasts
    const index = this.activeToasts.indexOf(toast)
    if (index > -1) {
      this.activeToasts.splice(index, 1)
    }
    
    // Удаляем из контейнера
    if (toast.parent) {
      toast.parent.removeChild(toast)
    }
    
    // Очищаем обработчики
    toast.removeAllListeners()
  }
  
  update(ticker) {
    const now = Date.now()
    
    for (let i = this.activeToasts.length - 1; i >= 0; i--) {
      const toast = this.activeToasts[i]
      
      // Ожидание перед удалением
      if (toast.waitStart) {
        const elapsed = now - toast.waitStart
        if (elapsed >= toast.duration && !toast.isRemoving) {
          toast.isRemoving = true
          // Мгновенное удаление
          toast.destroy({ children: true })
          this.activeToasts.splice(i, 1)
          this.repositionToasts()
          this.processQueue()
        }
      }
    }
  }
  
  repositionToasts() {
    let y = this.marginTop
    for (const toast of this.activeToasts) {
      toast.y = y
      y += toast.height + this.gap
    }
  }
  
  /**
   * Остановить автоудаление для конкретного уведомления (по клику)
   */
  pauseToast(toast) {
    toast.elapsed = toast.duration + 1 // Превысить лимит
  }
  
  /**
   * Очистить все уведомления
   */
  clear() {
    for (const toast of this.activeToasts) {
      toast.destroy({ children: true })
    }
    this.activeToasts = []
    this.queue = []
  }
  
  /**
   * Удалить при скрытии экрана
   */
  destroy() {
    this.clear()
    if (this._tickerCallback) {
      this.app.ticker.remove(this._tickerCallback)
    }
    this.container.destroy({ children: true })
  }
}

// Глобальный экземпляр (создаётся в game.js)
export let toastManager = null

export function initToastManager(app, parentContainer) {
  toastManager = new ToastManager(app, parentContainer)
  return toastManager
}
