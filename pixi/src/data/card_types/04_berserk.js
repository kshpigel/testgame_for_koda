import { log } from '../config.js'

// Берсерк - Баффается +20 ед.силы когда выбраны 3 карты Берсерк
export const berserk = {
  type: 4,
  name: 'Берсерк',
  description: 'Баффается +20 ед.силы когда выбраны 3 карты Берсерк',
  value: 5,
  image: '/assets/img/cards/type4.png',
  image_bg: '/assets/img/card.png',
  getBuff: (sel_card, battle) => {
    if (!sel_card.isSelected) return
    
    // Убираем старые баффы
    battle.cards.forEach(card => {
      if (card.cardData.type === 4) {
        card.removeBuff(sel_card.id)
      }
    })
    
    const berserkCount = battle.selectedCards.filter(c => c.cardData.type === 4).length
    
    if (berserkCount === 3 && battle.selectedCards.length === 3) {
      battle.selectedCards.forEach(card => {
        if (card.cardData.type === 4) {
          const val = battle.cntSteps === battle.defCntSteps ? 25 : 20
          card.addBuff(sel_card.id, sel_card.type, val)
        }
      })
    }
  },
  getSkill: (sel_card, battle) => {
    if (!sel_card.isSelected) return
    
    const berserkCount = battle.selectedCards.filter(c => c.cardData.type === 4).length
    
    if (berserkCount === 3 && battle.selectedCards.length === 3) {
      const cntInDeck = battle.currentDeck.filter(card => card.type === 4).length
      
      if (cntInDeck > 0) {
        battle.currentDeck = battle.currentDeck.filter(card => card.type !== 4)
        log(`Сброшено ${cntInDeck} карт Берсерк`)
      }
    }
  }
}
