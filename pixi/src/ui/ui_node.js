import * as PIXI from 'pixi.js'

/**
 * Базовый класс для всех UI элементов.
 * Стандартизирует работу с размерами, позицией и взаимодействие с Layout.
 */
export class UINode extends PIXI.Container {
  constructor(options = {}) {
    super()

    // Собственные размеры (до растягивания layout-ом)
    this._ownWidth = options.width || 0
    this._ownHeight = options.height || 0

    // Pivot по умолчанию - по центру (0,0 = верхний левый угол)
    // Наследники могут переопределить
  }

  /**
   * Собственная ширина элемента
   */
  get ownWidth() {
    return this._ownWidth || this.width
  }

  get ownHeight() {
    return this._ownHeight || this.height
  }

  /**
   * Вызывается layout-ом при изменении размеров
   */
  resize(width, height) {
    // По умолчанию ничего не делаем - элемент сам решает как реагировать
  }

  /**
   * Установить размеры
   */
  setSize(width, height) {
    this._ownWidth = width
    this._ownHeight = height
  }
}
