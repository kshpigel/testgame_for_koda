import * as PIXI from 'pixi.js'
import { CARD_CONFIG } from './card.js'

export class HandRenderer {
  constructor(app, cards, assets, cardTypes) {
    this.app = app
    this.cards = cards
    this.assets = assets
    this.cardTypes = cardTypes
  }
  
  layoutCards() {
    const cardWidth = CARD_CONFIG.width
    const cardHeight = CARD_CONFIG.height
    const totalWidth = this.cards.length * cardWidth + (this.cards.length - 1) * (-20)
    const handAreaY = this.app.screen.height - 160
    const startX = (this.app.screen.width - totalWidth) / 2 + 80
    const selectedOffset = cardHeight * 0.1
    const maxAngle = 12 * (Math.PI / 180)
    const centerIndex = (this.cards.length - 1) / 2

    this.cards.forEach((card, index) => {
      card.targetX = startX + index * (cardWidth - 20)
      card.targetY = card.isSelected ? handAreaY - selectedOffset : handAreaY
      
      const distFromCenter = index - centerIndex
      card.targetRotation = distFromCenter * maxAngle / Math.max(1, centerIndex)
    })
  }
  
  update() {
    this.cards.forEach(card => {
      card.update()
      
      if (card.targetX !== undefined && Math.abs(card.x - card.targetX) > 0.5) {
        card.x += (card.targetX - card.x) * 0.15
      }
      if (card.targetY !== undefined && Math.abs(card.y - card.targetY) > 0.5) {
        card.y += (card.targetY - card.y) * 0.15
      }
      if (card.targetRotation !== undefined && Math.abs(card.rotation - card.targetRotation) > 0.002) {
        card.rotation += (card.targetRotation - card.rotation) * 0.1
      }
    })
  }
}
