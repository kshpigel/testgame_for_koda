import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { Button } from './button.js'
import { t } from '../data/i18n.js'

const DIALOG_CONFIG = {
  height: 250,
  marginLeft: 50,
  marginRight: 50,
  marginTop: 50,
  marginBottom: 50,
  imageWidth: 350,
  borderTopWidth: 3,
  closeButtonSize: 40,
  continueText: 'дальше...',
  closeText: 'закрыть',
  fontSize: 20 // Увеличенный размер шрифта
}

export class Dialog {
  constructor(app, container) {
    this.app = app
    this.container = container
    this.dialogContainer = null
    this.textContainer = null
    this.currentText = ''
    this.fullText = ''
    this.chunks = []
    this.currentChunkIndex = 0
    this.onCloseCallback = null
    this.extraButtonsData = null // Храним данные кнопок
  }

  show(heroImage, text, onClose = null, extraButtons = []) {
    this.fullText = text
    this.currentChunkIndex = 0
    this.onCloseCallback = onClose
    this.extraButtons = extraButtons || []

    // Разбиваем текст на чанки
    this.chunks = this.calculateTextChunks(text)

    // Создаём диалог
    this.createDialog(heroImage)
    this.showChunk()
  }

  calculateTextChunks(text) {
    const screenWidth = this.app.screen.width

    // Область для текста: ширина экрана - отступы - картинка
    const availableWidth = screenWidth - DIALOG_CONFIG.marginLeft - DIALOG_CONFIG.marginRight - DIALOG_CONFIG.imageWidth - DIALOG_CONFIG.marginLeft
    // Высота для текста минус место на кнопки (80px для extraButtons)
    const extraButtonsHeight = this.extraButtons && this.extraButtons.length > 0 ? 80 : 40
    const availableHeight = DIALOG_CONFIG.height - DIALOG_CONFIG.marginTop - DIALOG_CONFIG.marginBottom - extraButtonsHeight

    // Примерная ширина символа (для моноширинного шрифта примерно)
    const charWidth = 14
    const lineHeight = 24
    const charsPerLine = Math.floor(availableWidth / charWidth)
    const linesPerChunk = Math.floor(availableHeight / lineHeight)
    const charsPerChunk = charsPerLine * linesPerChunk

    const chunks = []
    let currentPos = 0
    const textLength = text.length

    while (currentPos < textLength) {
      // Берём чанк текста
      let endPos = Math.min(currentPos + charsPerChunk, textLength)
      let chunk = text.substring(currentPos, endPos)

      // Если не в конце текста, обрезаем по последнему пробелу
      if (endPos < textLength) {
        const lastSpace = chunk.lastIndexOf(' ')
        if (lastSpace > 0) {
          chunk = chunk.substring(0, lastSpace)
          endPos = currentPos + lastSpace
        }
      }

      chunks.push(chunk)
      currentPos = endPos

      // Пропускаем пробелы в начале следующего чанка
      while (currentPos < textLength && text[currentPos] === ' ') {
        currentPos++
      }
    }

    return chunks
  }

  createDialog(heroImage) {
    // Удаляем старый диалог
    this.hide()

    this.dialogContainer = new PIXI.Container()
    this.dialogContainer.zIndex = 20000 // Выше модальных окон
    this.dialogContainer.sortableChildren = true
    
    // Overlay - перехватывает клики
    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 0.3)
    overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    overlay.endFill()
    overlay.eventMode = 'static'
    overlay.on('pointerdown', (e) => e.stopPropagation()) // Блокируем клики
    this.dialogContainer.addChild(overlay)

    // Фон диалога
    const bg = new PIXI.Graphics()
    const screenWidth = this.app.screen.width
    const y = this.app.screen.height - DIALOG_CONFIG.height

    bg.name = 'dialogBg'
    bg.beginFill(0xF5E7CF)
    bg.drawRect(0, y, screenWidth, DIALOG_CONFIG.height)
    bg.endFill()

    bg.lineStyle(DIALOG_CONFIG.borderTopWidth, 0x8c1300)
    bg.moveTo(0, y)
    bg.lineTo(screenWidth, y)

    this.dialogContainer.addChild(bg)

    // Кнопка закрытия (крестик) справа сверху
    const closeBtn = new Button('✕', {
      width: DIALOG_CONFIG.closeButtonSize,
      height: DIALOG_CONFIG.closeButtonSize,
      color: colors.ui.button.reset,
      fontSize: 20,
      app: this.app,
      onClick: () => this.hide()
    })
    closeBtn.name = 'closeBtn'
    closeBtn.setX(screenWidth - DIALOG_CONFIG.closeButtonSize / 2 - 20)
    closeBtn.setY(y + DIALOG_CONFIG.closeButtonSize / 2 + 10)
    this.dialogContainer.addChild(closeBtn)

    // Картинка героя слева
    if (heroImage) {
      const hero = new PIXI.Sprite(heroImage)
      hero.name = 'heroSprite'
      hero.anchor.set(0.5, 0.5)
      // Масштабируем по ширине imageWidth
      const targetWidth = DIALOG_CONFIG.imageWidth
      const scale = targetWidth / hero.texture.width
      hero.scale.set(scale)
      hero.x = DIALOG_CONFIG.marginLeft + targetWidth / 2
      hero.y = y + DIALOG_CONFIG.height / 2
      this.dialogContainer.addChild(hero)
    }

    // Контейнер для текста
    this.textContainer = new PIXI.Container()
    this.textContainer.x = DIALOG_CONFIG.marginLeft + DIALOG_CONFIG.imageWidth + DIALOG_CONFIG.marginLeft
    this.textContainer.y = y + DIALOG_CONFIG.marginTop
    this.dialogContainer.addChild(this.textContainer)

    // Создаём контейнер для кнопок (если есть extraButtons)
    if (this.extraButtons && this.extraButtons.length > 0) {
      this.extraButtonsContainer = new PIXI.Container()
      this.dialogContainer.addChild(this.extraButtonsContainer)
    }

    // Добавляем на сцену
    this.container.addChild(this.dialogContainer)
  }

  showChunk() {
    // Очищаем контейнер текста
    this.textContainer.removeChildren()

    // Очищаем старые кнопки из extraButtonsContainer
    if (this.extraButtonsContainer) {
      this.extraButtonsContainer.removeChildren()
    }

    let chunk = this.chunks[this.currentChunkIndex]
    const isLastChunk = this.currentChunkIndex === this.chunks.length - 1

    // Текст чанка
    const textObj = new PIXI.Text(chunk, {
      fontFamily: FONT,
      fontSize: 24,
      fill: '#333333',
      wordWrap: true,
      wordWrapWidth: this.app.screen.width - DIALOG_CONFIG.marginLeft * 3 - DIALOG_CONFIG.imageWidth - DIALOG_CONFIG.marginRight
    })
    textObj.x = 0
    textObj.y = 0
    this.textContainer.addChild(textObj)

    // Рассчитываем необходимую высоту диалога
    let buttonsHeight = 20 + 20 // отступ + кнопка текстом
    if (this.extraButtons && this.extraButtons.length > 0) {
      buttonsHeight = 45 + 20 // высота кнопки + отступ
    }
    
    const neededHeight = textObj.height + buttonsHeight + DIALOG_CONFIG.marginTop + DIALOG_CONFIG.marginBottom
    const maxHeight = this.app.screen.height - 100 // Оставляем отступ сверху
    const dialogHeight = Math.min(Math.max(neededHeight, DIALOG_CONFIG.height), maxHeight)
    const newY = this.app.screen.height - dialogHeight
    
    // Обновляем высоту фона диалога
    const dialogBg = this.dialogContainer.getChildByName('dialogBg')
    if (dialogBg) {
      dialogBg.clear()
      dialogBg.beginFill(0xF5E7CF)
      dialogBg.drawRect(0, newY, this.app.screen.width, dialogHeight)
      dialogBg.endFill()
      dialogBg.lineStyle(DIALOG_CONFIG.borderTopWidth, 0x8c1300)
      dialogBg.moveTo(0, newY)
      dialogBg.lineTo(this.app.screen.width, newY)
      
      // Перемещаем кнопку закрытия
      const closeBtn = this.dialogContainer.getChildByName('closeBtn')
      if (closeBtn) {
        closeBtn.setY(newY + DIALOG_CONFIG.closeButtonSize / 2 + 10)
      }
      
      // Перемещаем картинку героя
      const hero = this.dialogContainer.getChildByName('heroSprite')
      if (hero) {
        hero.y = newY + dialogHeight / 2
      }
    }

    // Если есть дополнительные кнопки - не добавляем текстовую кнопку "дальше..."
    if (this.extraButtons && this.extraButtons.length > 0) {
      // Пустой блок, extraButtons добавятся ниже
    } else {
      // Кнопка "дальше..." или "закрыть" - оба красным
      const buttonText = isLastChunk ? t('ui.close') : t('ui.continue') + '...'

      const continueBtn = new PIXI.Text(buttonText, {
        fontFamily: FONT,
        fontSize: 24,
        fontWeight: 'bold',
        fill: '#aa0000'
      })
      continueBtn.anchor.set(0, 0.5)
      continueBtn.x = 0
      continueBtn.y = textObj.height + 20
      continueBtn.eventMode = 'static'
      continueBtn.cursor = 'pointer'
      continueBtn.on('pointerdown', () => {
        if (isLastChunk) {
          this.hide()
        } else {
          this.currentChunkIndex++
          this.showChunk()
        }
      })

      this.textContainer.addChild(continueBtn)
    }

    // Добавляем дополнительные кнопки (например, для портала)
    if (this.extraButtons && this.extraButtons.length > 0 && this.extraButtonsContainer) {
      // Устанавливаем позицию контейнера кнопок внизу диалога
      this.extraButtonsContainer.y = newY + dialogHeight - 45 - 10
      this.extraButtonsContainer.x = DIALOG_CONFIG.marginLeft + DIALOG_CONFIG.imageWidth + DIALOG_CONFIG.marginLeft + 80
      
      this.extraButtons.forEach((btnConfig, index) => {
        const btn = new Button(btnConfig.text, {
          width: btnConfig.width || 140,
          height: btnConfig.height || 45,
          color: btnConfig.color || colors.ui.button.continue,
          fontSize: btnConfig.fontSize || 18,
          app: this.app,
          onClick: () => {
            this.hide()
            if (btnConfig.onClick) {
              btnConfig.onClick()
            }
          }
        })
        // Устанавливаем визуальные координаты для правильной работы scale анимации
        btn._visualX = index * 160
        btn._visualY = 0
        btn.x = index * 160 + btn.pivot.x
        btn.y = 0 + btn.pivot.y
        this.extraButtonsContainer.addChild(btn)
      })
      buttonsHeight = 45 + 20
    }

    // Центрируем текст по вертикали (кнопки отдельно внизу)
    const contentHeight = textObj.height + 20 + 20
    const availableHeight = dialogHeight - DIALOG_CONFIG.marginTop - DIALOG_CONFIG.marginBottom
    this.textContainer.y = newY + DIALOG_CONFIG.marginTop + (availableHeight - contentHeight) / 2
  }

  hide() {
    if (this.dialogContainer) {
      this.container.removeChild(this.dialogContainer)
      this.dialogContainer.destroy({ children: true })
      this.dialogContainer = null
    }
  }
}
