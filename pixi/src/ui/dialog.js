import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { Button } from './button.js'

const DIALOG_CONFIG = {
  height: 300,
  marginLeft: 50,
  marginRight: 50,
  marginTop: 50,
  marginBottom: 50,
  imageWidth: 350,
  borderTopWidth: 3,
  closeButtonSize: 40,
  continueText: 'дальше...',
  closeText: 'закрыть'
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
  }

  show(heroImage, text, onClose = null) {
    this.fullText = text
    this.currentChunkIndex = 0
    this.onCloseCallback = onClose

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
    // Высота для текста минус место на кнопку (примерно 40px)
    const availableHeight = DIALOG_CONFIG.height - DIALOG_CONFIG.marginTop - DIALOG_CONFIG.marginBottom - 50

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

    // Фон диалога
    const bg = new PIXI.Graphics()
    const screenWidth = this.app.screen.width
    const y = this.app.screen.height - DIALOG_CONFIG.height

    // Молочный фон (#F5E7CF)
    bg.beginFill(0xF5E7CF)
    bg.drawRect(0, y, screenWidth, DIALOG_CONFIG.height)
    bg.endFill()

    // Красная полоса сверху (0x8c1300 = colors.ui.button.reset)
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
    closeBtn.setX(screenWidth - DIALOG_CONFIG.closeButtonSize / 2 - 20)
    closeBtn.setY(y + DIALOG_CONFIG.closeButtonSize / 2 + 10)
    this.dialogContainer.addChild(closeBtn)

    // Картинка героя слева
    if (heroImage) {
      const hero = new PIXI.Sprite(heroImage)
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

    // Добавляем на сцену
    this.container.addChild(this.dialogContainer)
  }

  showChunk() {
    // Очищаем контейнер текста
    this.textContainer.removeChildren()

    let chunk = this.chunks[this.currentChunkIndex]
    const isLastChunk = this.currentChunkIndex === this.chunks.length - 1
    const y = this.app.screen.height - DIALOG_CONFIG.height + DIALOG_CONFIG.marginTop

    // Добавляем "..." если не последний чанк
    if (!isLastChunk) {
      chunk = chunk.trim() + '...'
    }

    // Текст чанка
    const textObj = new PIXI.Text(chunk, {
      fontFamily: FONT,
      fontSize: 18,
      fill: '#333333',
      wordWrap: true,
      wordWrapWidth: this.app.screen.width - DIALOG_CONFIG.marginLeft * 3 - DIALOG_CONFIG.imageWidth - DIALOG_CONFIG.marginRight
    })
    textObj.x = 0
    textObj.y = 0
    this.textContainer.addChild(textObj)

    // Кнопка "дальше..." или "закрыть" - оба красным
    const buttonText = isLastChunk ? DIALOG_CONFIG.closeText : DIALOG_CONFIG.continueText

    const continueBtn = new PIXI.Text(buttonText, {
      fontFamily: FONT,
      fontSize: 18,
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

    // Обновляем позицию контейнера текста по вертикали
    const totalHeight = textObj.height + 20 + 20
    this.textContainer.y = y + (DIALOG_CONFIG.height - DIALOG_CONFIG.marginTop - DIALOG_CONFIG.marginBottom - totalHeight) / 2
  }

  hide() {
    if (this.dialogContainer) {
      this.container.removeChild(this.dialogContainer)
      this.dialogContainer.destroy({ children: true })
      this.dialogContainer = null
    }
  }
}
