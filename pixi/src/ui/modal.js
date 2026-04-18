import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { Z } from '../data/z_index.js'
import { Button } from './button.js'

/**
 * Modal - модальное окно
 * 
 * ПАРАМЕТРЫ:
 * - title: string - заголовок
 * - width: number - ширина окна
 * - height: number - высота окна
 * - bgColor: string - цвет фона окна
 * - onClose: function - колбэк закрытия
 * 
 * ОГРАНИЧЕНИЯ:
 * - maxWidth = screen.width - 100
 * - maxHeight = screen.height - 100
 */
export class Modal {
  static modalStack = [] // Стек открытых модальных окон
  static escapeHandler = null
  
  constructor(app, options = {}) {
    this.app = app
    this.title = options.title || ''
    this.width = options.width || 400
    this.height = options.height || 300
    this.bgColor = options.bgColor || colors.ui.panel.bg
    this.onClose = options.onClose || null
    this.showCloseButton = options.showCloseButton !== false // по умолчанию показываем
    this.buttons = options.buttons || [] // массив кнопок { text, color, action }
    
    // Ограничения
    const maxW = this.app.screen.width - 100
    const maxH = this.app.screen.height - 100
    this.width = Math.min(this.width, maxW)
    this.height = Math.min(this.height, maxH)
    
    this.container = new PIXI.Container()
    this.container.sortableChildren = true
    this.container.zIndex = Z.UI_OVERLAY
    this.container.visible = false
    
    this.create()
  }
  
  create() {
    // Overlay - перехватывает клики
    this.overlay = new PIXI.Graphics()
    this.overlay.beginFill(0x000000, 0.7)
    this.overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    this.overlay.endFill()
    this.overlay.eventMode = 'static'
    this.overlay.on('pointerdown', () => {}) // Перехватывает клики
    this.container.addChild(this.overlay)
    
    // Контейнер окна (центр)
    const centerX = this.app.screen.width / 2
    const centerY = this.app.screen.height / 2
    
    // Окно
    this.window = new PIXI.Container()
    this.window.zIndex = 1
    this.window.x = centerX
    this.window.y = centerY
    this.container.addChild(this.window)
    
    // Фон окна с бордером
    const bg = new PIXI.Graphics()
    bg.lineStyle(2, colors.ui.text.primary) // бордер цвета текста
    bg.beginFill(this.bgColor)
    bg.drawRoundedRect(-this.width/2, -this.height/2, this.width, this.height, 10)
    bg.endFill()
    this.window.addChild(bg)
    
    // Заголовок
    if (this.title) {
      const titleText = new PIXI.Text(this.title, {
        fontFamily: FONT,
        fontSize: 24,
        fontWeight: 'bold',
        fill: colors.ui.text.primary || '#ffffff'
      })
      titleText.anchor.set(0.5, 0)
      titleText.y = -this.height/2 + 15
      this.window.addChild(titleText)
    }
    
    // Кнопка закрытия (опционально)
    if (this.showCloseButton) {
      this.closeBtn = new Button('✕', {
        width: 40,
        height: 40,
        color: colors.ui.button.reset || '#aa0000',
        fontSize: 20,
        app: this.app
      })
      this.closeBtn.setX(this.width/2 - 25)
      this.closeBtn.setY(-this.height/2 + 25)
      this.closeBtn.onClick = () => this.hide()
      this.window.addChild(this.closeBtn)
    }
    
    // Контейнер для контента (дочерние элементы добавлять сюда)
    this.content = new PIXI.Container()
    this.content.y = 30 // Отступ от заголовка
    this.window.addChild(this.content)
    
    // Кнопки внизу (если есть)
    if (this.buttons && this.buttons.length > 0) {
      const btnCount = this.buttons.length
      const btnWidth = 100
      const btnHeight = 40
      const gap = 15
      const totalWidth = btnCount * btnWidth + (btnCount - 1) * gap
      const startX = -totalWidth / 2 + btnWidth / 2
      const btnY = this.height / 2 - btnHeight / 2 - 15
      
      this.buttons.forEach((btnConfig, index) => {
        const btn = new Button(btnConfig.text, {
          width: btnWidth,
          height: btnHeight,
          color: btnConfig.color || colors.ui.button.continue,
          fontSize: 18,
          app: this.app
        })
        btn.setX(startX + index * (btnWidth + gap))
        btn.setY(btnY)
        btn.onClick = () => {
          if (btnConfig.action) btnConfig.action()
        }
        this.window.addChild(btn)
      })
    }
  }
  
  // Установить контент (принимает функцию которая получает container)
  setContent(callback) {
    if (callback && typeof callback === 'function') {
      callback(this.content)
    }
  }
  
  show() {
    this.container.visible = true
    // Добавляем в стек
    Modal.modalStack.push(this)
    
    // Подключаем обработчик Escape один раз
    if (!Modal.escapeHandler) {
      Modal.escapeHandler = (e) => {
        if (e.key === 'Escape' && Modal.modalStack.length > 0) {
          const topModal = Modal.modalStack.pop()
          if (topModal) topModal.hide()
        }
      }
      window.addEventListener('keydown', Modal.escapeHandler)
    }
  }
  
  hide() {
    this.container.visible = false
    // Удаляем из стека если там есть
    const idx = Modal.modalStack.indexOf(this)
    if (idx > -1) Modal.modalStack.splice(idx, 1)
    
    if (this.onClose) this.onClose()
  }
  
  // Добавить контент в окно
  addChild(child) {
    this.content.addChild(child)
  }
  
  // Добавить в stage
  addToStage(stage) {
    stage.addChild(this.container)
  }
  
  // Удалить из stage
  removeFromStage(stage) {
    stage.removeChild(this.container)
  }
  
  // Центрировать контент
  centerContent() {
    this.content.x = 0
  }
  
  // Полностью уничтожить модалку
  destroy() {
    if (this.container) {
      this.container.destroy({ children: true })
      this.container = null
    }
    this.content = null
    this.window = null
    this.closeBtn = null
  }
}
