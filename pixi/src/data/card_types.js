import { log } from './config.js'

export const card_types = [
	{
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
	},
	{
		type: 2,
		name: 'Ополченец',
		description: 'Боевая единица. Баффается от Копейщицы.',
		value: 5,
		image: '/assets/img/cards/type2.png',
		image_bg: '/assets/img/card.png'
	},
	{
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
	},
	{
		type: 4,
		name: 'Берсерк',
		description: 'Баффается +20 ед.силы когда выбраны 3 карты Берсерк',
		value: 5,
		image: '/assets/img/cards/type4.png',
		image_bg: '/assets/img/card.png',
		getBuff: (sel_card, battle) => {
			// В оригинале: active === true означает карта НЕ выбрана
			// В pixi: isSelected = false означает карта НЕ выбрана
			// Значит: if (!sel_card.isSelected) return - если НЕ выбран, return
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
	},
	{
		type: 5,
		name: 'Рыцарь',
		description: 'Боевая единица. Баффается от Копейщицы.',
		value: 12,
		image: '/assets/img/cards/type5.png',
		image_bg: '/assets/img/card.png'
	},
	{
		type: 6,
		name: 'Лучница',
		description: 'Если лучниц 4 или больше, рука прибавляет 1 ход',
		value: 7,
		image: '/assets/img/cards/type6.png',
		image_bg: '/assets/img/card.png'
	},
	{
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
	},
	{
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
	},
	{
		type: 9,
		name: 'Викинг',
		description: 'Боевая единица.',
		value: 14,
		image: '/assets/img/cards/type9.png',
		image_bg: '/assets/img/card.png'
	},
	{
		type: 10,
		name: 'Башня',
		description: 'Просто башня.',
		value: 1,
		image: '/assets/img/cards/type10.png',
		image_bg: '/assets/img/card.png'
	},
	{
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
]
