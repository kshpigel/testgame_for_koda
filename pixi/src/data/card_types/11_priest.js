// Священник - Баффает все карты в руке на 1-5 ед.силы в случайном порядке.
export const priest = {
  type: 11,
  name: 'Священник',
  description: 'Баффает все карты в руке на 1-5 ед.силы в случайном порядке.',
  value: 1,
  image: '/assets/img/cards/type11.png',
  image_bg: '/assets/img/card.png',
  getBuff: (sel_card, battle) => {
    // Священник работает когда он НЕ выбран (лежит в руке)
    if (sel_card.isSelected) return
    
    // Баффаем все выбранные карты кроме себя на 1-5 случайно
    battle.selectedCards.forEach(card => {
      if (card !== sel_card) {
        // Ключ: id священника + id целевой карты
        const buffKey = `${sel_card.id}_${card.id}`
        
        // Проверяем - если уже был бафф от этого священника для этой карты, используем его
        if (!battle.priestBuffs[buffKey]) {
          battle.priestBuffs[buffKey] = Math.floor(Math.random() * 5) + 1
        }
        card.addBuff(sel_card.id, sel_card.type, battle.priestBuffs[buffKey])
      }
    })
  }
}
