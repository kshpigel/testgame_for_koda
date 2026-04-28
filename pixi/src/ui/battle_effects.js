import * as PIXI from 'pixi.js'
import { BlurFilter } from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { soundManager } from '../audio/sound_manager.js'
import { t } from '../data/i18n.js'

export class BattleEffects {
  constructor(app, container, assets) {
    this.app = app
    this.container = container
    this.assets = assets
    this.enemyDisplay = null
  }
  
  setEnemyDisplay(enemy) {
    this.enemyDisplay = enemy
  }
  
  showDamage(damage, onComplete) {
    // Анимация удара - красная вспышка экрана
    const overlay = new PIXI.Graphics()
    overlay.beginFill(colors.ui.text.damage, 0.6)
    overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    overlay.endFill()
    this.container.addChild(overlay)
    
    let alpha = 0.6
    const fadeOverlay = () => {
      alpha -= 0.03
      overlay.alpha = alpha
      if (alpha > 0) {
        requestAnimationFrame(fadeOverlay)
      } else {
        this.container.removeChild(overlay)
        overlay.destroy()
        this.showDamageText(damage, onComplete)
      }
    }
    fadeOverlay()
    
    // Тряска врага
    if (this.enemyDisplay) {
      const enemy = this.enemyDisplay
      const originalX = enemy.x
      const originalY = enemy.y
      
      let shakeTime = 0
      const shakeDuration = 20
      const shakeAmount = 6
      
      const shake = () => {
        if (shakeTime < shakeDuration) {
          enemy.x = originalX + (Math.random() - 0.5) * shakeAmount
          enemy.y = originalY + (Math.random() - 0.5) * shakeAmount
          shakeTime++
          requestAnimationFrame(shake)
        } else {
          enemy.x = originalX
          enemy.y = originalY
        }
      }
      shake()
    }
  }
  
  showDamageText(damage, onComplete) {
    const damageText = new PIXI.Text(`-${damage}`, {
      fontFamily: FONT,
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#ff4444',
      stroke: '#000000',
      strokeThickness: 4
    })
    damageText.anchor.set(0.5)
    damageText.x = this.app.screen.width / 2
    damageText.y = 200
    damageText.zIndex = 2000
    this.container.addChild(damageText)
    
    let y = 200
    let textAlpha = 1
    const animateText = () => {
      y -= 2
      textAlpha -= 0.02
      damageText.y = y
      damageText.alpha = textAlpha
      if (textAlpha > 0) {
        requestAnimationFrame(animateText)
      } else {
        this.container.removeChild(damageText)
        damageText.destroy()
        if (onComplete) onComplete()
      }
    }
    animateText()
  }
  
  showVictory(onComplete) {
    soundManager.play('battleVictory')
    
    // Затемнение
    const overlay = new PIXI.Graphics()
    overlay.beginFill(colors.ui.text.primary, 0.7)
    overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    overlay.endFill()
    this.container.addChild(overlay)
    
    // Картинка победы
    if (this.assets && this.assets.victory && this.assets.victory.texture) {
      const victorySprite = new PIXI.Sprite(this.assets.victory.texture)
      victorySprite.anchor.set(0.5)
      victorySprite.x = this.app.screen.width / 2
      victorySprite.y = this.app.screen.height / 2
      const scale = Math.min(
        this.app.screen.width * 0.8 / victorySprite.texture.width,
        this.app.screen.height * 0.8 / victorySprite.texture.height
      )
      victorySprite.scale.set(scale)
      this.container.addChild(victorySprite)
    }
    
    // Текст победы
    const victoryText = new PIXI.Text(t('battle.victory'), {
      fontFamily: FONT,
      fontSize: 64,
      fontWeight: 'bold',
      fill: colors.ui.text.victory,
      stroke: '#000000',
      strokeThickness: 4
    })
    victoryText.anchor.set(0.5)
    victoryText.x = this.app.screen.width / 2
    victoryText.y = this.app.screen.height / 2 - 100
    this.container.addChild(victoryText)
    
    setTimeout(() => {
      if (onComplete) onComplete()
    }, 2000)
  }
  
  showDefeat(onComplete) {
    soundManager.play('battleFail')
    
    // Затемнение
    const overlay = new PIXI.Graphics()
    overlay.beginFill(colors.ui.text.primary, 0.7)
    overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    overlay.endFill()
    this.container.addChild(overlay)
    
    // Картинка поражения
    if (this.assets && this.assets.fail && this.assets.fail.texture) {
      const failSprite = new PIXI.Sprite(this.assets.fail.texture)
      failSprite.anchor.set(0.5)
      failSprite.x = this.app.screen.width / 2
      failSprite.y = this.app.screen.height / 2
      const scale = Math.min(
        this.app.screen.width * 0.8 / failSprite.texture.width,
        this.app.screen.height * 0.8 / failSprite.texture.height
      )
      failSprite.scale.set(scale)
      this.container.addChild(failSprite)
    }
    
    // Текст поражения
    const defeatText = new PIXI.Text(t('battle.defeat'), {
      fontFamily: FONT,
      fontSize: 64,
      fontWeight: 'bold',
      fill: colors.ui.text.defeat,
      stroke: '#000000',
      strokeThickness: 4
    })
    defeatText.anchor.set(0.5)
    defeatText.x = this.app.screen.width / 2
    defeatText.y = this.app.screen.height / 2 - 100
    this.container.addChild(defeatText)
    
    setTimeout(() => {
      if (onComplete) onComplete()
    }, 2000)
  }
}
