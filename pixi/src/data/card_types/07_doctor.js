// Доктор - Баффает все карты в руке на 3 ед.силы
export const doctor = {
  type: 7,
  name: 'Доктор',
  description: 'Баффает все карты в руке на 3 ед.силы',
  value: 1,
  image: '/assets/img/cards/type7.png',
  image_bg: '/assets/img/card.png',
  getBuff: (sel_card, battle) => {
    // Доктор работает когда он НЕ выбран (лежит в руке)
    if (sel_card.isSelected) return
    
    // Баффаем все выбранные карты кроме себя на +3
    battle.selectedCards.forEach(card => {
      if (card !== sel_card) {
        card.addBuff(sel_card.id, sel_card.type, 3)
      }
    })
  }
}
