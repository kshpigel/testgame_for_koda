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
    
    // Угол: чтобы края были ниже центра (разворачиваем веер)
    const maxAngle = 12 * (Math.PI / 180)
    const centerIndex = (this.cards.length - 1) / 2
    
    // Смещение по Y для краёв (чтобы были ниже центра)
    const edgeYOffset = 30

    this.cards.forEach((card, index) => {
      card.targetX = startX + index * (cardWidth - 20)
      
      const distFromCenter = index - centerIndex
      const normalizedDist = distFromCenter / Math.max(1, centerIndex)
      
      // Угол: края ниже центра
      card.targetRotation = normalizedDist * maxAngle
      
      // Y: края ниже центра на edgeYOffset + небольшой наклон дуги
      const yOffset = Math.abs(normalizedDist) * edgeYOffset
      // Наклон: правая сторона ниже (плюс X * коэффициент)
      const tiltOffset = (index - centerIndex) * 4
      card.targetY = card.isSelected ? handAreaY - selectedOffset : handAreaY + yOffset + tiltOffset
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
