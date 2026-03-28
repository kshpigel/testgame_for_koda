import * as PIXI from 'pixi.js'
import { FONT } from './data/fonts.js'
import { colors } from './data/colors.js'
import { t } from './data/i18n.js'

export class LoadingScreen {
  constructor(app) {
    this.app = app
    this.container = new PIXI.Container()
    this.progress = 0
    this.message = ''
  }

  async show() {
    // Чёрный фон
    const bg = new PIXI.Graphics()
    bg.beginFill(colors.background.battle)
    bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    bg.endFill()
    this.container.addChild(bg)

    // Текст загрузки
    const style = new PIXI.TextStyle({
      fontFamily: FONT,
      fontSize: 32,
      fill: colors.ui.text.primary
    })
    this.text = new PIXI.Text(t('loading.loading'), style)
    this.text.anchor.set(0.5)
    this.text.x = this.app.screen.width / 2
    this.text.y = this.app.screen.height / 2
    this.container.addChild(this.text)

    // Спиннер (вращающийся круг)
    this.spinner = new PIXI.Graphics()
    this.drawSpinner(0)
    this.spinner.x = this.app.screen.width / 2
    this.spinner.y = this.app.screen.height / 2 + 60
    this.container.addChild(this.spinner)
    
    this.app.stage.addChild(this.container)
    
    // Анимация спиннера
    this.spinnerCallback = () => {
      this.spinner.rotation += 0.1
    }
    this.app.ticker.add(this.spinnerCallback)
  }

  drawSpinner(angle) {
    this.spinner.clear()
    this.spinner.lineStyle(4, colors.ui.panel.border)
    this.spinner.arc(0, 0, 20, angle, angle + 1.5)
  }

  setProgress(percent, msg = '') {
    this.text.text = msg || `${t('loading.loading')} ${Math.round(percent)}%`
  }

  hide() {
    this.app.ticker.remove(this.spinnerCallback)
    this.app.stage.removeChild(this.container)
  }

  resize(width, height) {
    this.container.removeChildren()
    this.show()
  }
}
