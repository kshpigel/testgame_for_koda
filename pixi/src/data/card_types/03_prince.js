// Князь - Баффает все карты в руке на 3 ед.силы.
export const prince = {
  type: 3,
  name: 'Князь',
  description: 'Баффает все карты в руке на 3 ед.силы.',
  value: 15,
  image: '/assets/img/cards/type3.png',
  image_bg: '/assets/img/card.png',
  getBuff: (sel_card, battle) => {
    // Убираем старые баффы
    battle.cards.forEach(card => {
      card.removeBuff(sel_card.id)
    })
    
    // Если князь выбран - баффаем остальные
    if (sel_card.isSelected) {
      battle.selectedCards.forEach(card => {
        if (card !== sel_card) {
          card.addBuff(sel_card.id, sel_card.type, 3)
        }
      })
    }
  }
}
