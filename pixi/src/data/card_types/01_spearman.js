// Копейщица - Баффает Ополченцев, Рыцарей и Князя, увеличивая их силу x2
export const spearman = {
  type: 1,
  name: 'Копейщица',
  description: 'Баффает Ополченцев, Рыцарей и Князя, увеличивая их силу x2',
  value: 2,
  image: '/assets/img/cards/type1.png',
  image_bg: '/assets/img/card.png',
  getBuff: (sel_card, battle) => {
    // Убираем старые баффы от этой копейщицы
    battle.cards.forEach(card => {
      if (card.type === 2 || card.type === 3 || card.type === 5) {
        card.removeBuff(sel_card.id)
      }
    })
    
    // Если копейщица выбрана - добавляем бафф
    if (sel_card.isSelected) {
      battle.selectedCards.forEach(card => {
        if (card.type === 2 || card.type === 3 || card.type === 5) {
          card.addBuff(sel_card.id, sel_card.type, card.cardData.value)
        }
      })
    }
  }
}
