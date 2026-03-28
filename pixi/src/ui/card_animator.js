import * as PIXI from 'pixi.js'
import { FONT } from '../data/fonts.js'
import { colors } from '../data/colors.js'
import { soundManager } from '../audio/sound_manager.js'

export class CardAnimator {
  constructor(app, container) {
    this.app = app
    this.container = container
  }
  
  animateCardIn(card, onComplete) {
    const targetX = card.targetX
    const targetY = card.targetY
    const startX = card.x
    const startY = card.y
    
    let progress = 0
    const animate = () => {
      progress += 0.04
      if (progress >= 1) {
        card.x = targetX
        card.y = targetY
        card.scale.set(1)
        if (onComplete) onComplete()
      } else {
        const t = 1 - Math.pow(1 - progress, 3)
        card.x = startX + (targetX - startX) * t
        card.y = startY + (targetY - startY) * t
        card.scale.set(0.1 + 0.9 * t)
        requestAnimationFrame(animate)
      }
    }
    animate()
  }
  
  animateCardOut(card, onComplete) {
    // Проверяем что карта ещё имеет валидный контейнер
    if (!card || !card.parent) {
      if (onComplete) onComplete()
      return
    }
    
    const startX = card.x
    const startY = card.y
    const targetY = this.app.screen.height + 300
    
    let progress = 0
    const animate = () => {
      // Проверяем на каждом кадре
      if (!card || !card.parent) {
        if (onComplete) onComplete()
        return
      }
      progress += 0.03
      if (progress >= 1) {
        card.y = targetY
        card.scale.set(0.2)
        if (onComplete) onComplete()
      } else {
        const t = progress * progress * progress
        card.x = startX
        card.y = startY + (targetY - startY) * t
        card.scale.set(1 - 0.8 * t)
        requestAnimationFrame(animate)
      }
    }
    animate()
  }
}
