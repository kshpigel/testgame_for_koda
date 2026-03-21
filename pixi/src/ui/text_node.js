import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { UINode } from './ui_node.js'

/**
 * TextNode - текстовый контейнер на UINode
 * 
 * ПАРАМЕТРЫ:
 * - text: string - текст
 * - width: number - ширина области
 * - height: number - высота области  
 * - fontSize: number - размер шрифта
 * - color: string - цвет текста
 * - align: 'left'|'center'|'right' - выравнивание
 * - shadow: boolean - добавить тень
 * - bold: boolean - жирный шрифт
 */
export class TextNode extends UINode {
  constructor(options = {}) {
    super({
      width: options.width || 100,
      height: options.height || 30,
      app: options.app || null,
      scaleSpeed: options.scaleSpeed || 0.15
    })
    
    this.text = options.text || ''
    this.fontSize = options.fontSize || 20
    this.color = options.color || '#FFFFFF'
    this.align = options.align || 'center'
    this.shadow = options.shadow !== false
    this.bold = options.bold !== false
    
    this.create()
    this.updateDebug()
  }
  
  create() {
    // Тень
    if (this.shadow) {
      this.textShadow = new PIXI.Text(this.text, {
        fontFamily: FONT,
        fontSize: this.fontSize,
        fontWeight: this.bold ? 'bold' : 'normal',
        fill: '#000000'
      })
      this.textShadow.anchor.set(0.5)
      this.textShadow.x = 2
      this.textShadow.y = 2
      this.addChild(this.textShadow)
    }
    
    // Основной текст
    this.textObj = new PIXI.Text(this.text, {
      fontFamily: FONT,
      fontSize: this.fontSize,
      fontWeight: this.bold ? 'bold' : 'normal',
      fill: this.color
    })
    this.textObj.anchor.set(0.5)
    this.addChild(this.textObj)
    
    this.updatePosition()
  }
  
  updatePosition() {
    // Выравнивание относительно центра (благодаря pivot)
    let x = 0
    if (this.align === 'left') {
      x = -this._width / 2
      this.textObj.anchor.set(0, 0.5)
      if (this.textShadow) this.textShadow.anchor.set(0, 0.5)
    } else if (this.align === 'right') {
      x = this._width / 2
      this.textObj.anchor.set(1, 0.5)
      if (this.textShadow) this.textShadow.anchor.set(1, 0.5)
    } else {
      // center
      this.textObj.anchor.set(0.5)
      if (this.textShadow) this.textShadow.anchor.set(0.5)
    }
    
    this.textObj.x = x
    if (this.textShadow) {
      this.textShadow.x = x + 2
      this.textShadow.y = 2
    }
  }
  
  setText(text) {
    this.text = text
    this.textObj.text = text
    if (this.textShadow) {
      this.textShadow.text = text
    }
  }
  
  getText() {
    return this.text
  }
  
  setColor(color) {
    this.color = color
    this.textObj.style.fill = color
  }
  
  setFontSize(size) {
    this.fontSize = size
    this.textObj.style.fontSize = size
    if (this.textShadow) {
      this.textShadow.style.fontSize = size
    }
  }
}
