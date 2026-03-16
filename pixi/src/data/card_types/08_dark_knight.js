// Темный рыцарь - Сила равна количеству карт в колоде
export const dark_knight = {
  type: 8,
  name: 'Темный рыцарь',
  description: 'Сила равна количеству карт в колоде',
  value: 1,
  image: '/assets/img/cards/type8.png',
  image_bg: '/assets/img/card.png',
  getBuff: (sel_card, battle) => {
    if (sel_card.isSelected && sel_card.getBuffByType(sel_card.type).length === 0) {
      sel_card.addBuff(sel_card.id, sel_card.type, battle.currentDeck.length - 1)
    } else if (!sel_card.isSelected) {
      sel_card.removeBuff(sel_card.id)
    }
  }
}
