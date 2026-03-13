import { battleClass } from '../classes/game'
import { messagesClass } from '../classes/game'

export const card_types = [
	{
		type: 1,
		name: 'Копейщица',
		description: `<h1>Копейщица</h1><p>Баффает <b>Ополченцев</b>, <b>Рыцарей</b> и <b>Князя</b>, увеличивая их силу x2</p>`,
		value: '2',
		image: '/assets/static/cards/type1.png',
		image_bg: '/assets/static/card.png',
		getBuff: (sel_card) => {
			battleClass.hand.forEach(card => {
				if (card.type === 2 || card.type === 3 || card.type === 5) {
					if (card.active === true) card.removeBuff(sel_card.id)
				}
			})
			if (sel_card.active === false) {
				battleClass.selectedCards.forEach(card => {
					if (card.type === 2 || card.type === 3 || card.type === 5) {
						card.addBuff(sel_card.id,sel_card.type, card.value)
					}
				})
			}else{
				battleClass.hand.forEach(card => {
					if (card.type === 2 || card.type === 3 || card.type === 5) {
						card.removeBuff(sel_card.id)
					}
				})
			}
		}
	},
	{
		type: 2,
		name: 'Ополченец',
		description: `<h1>Ополченец</h1><p>Боевая единица. Баффается от <b>Копейщицы</b>.</p>`,
		value: '5',
		image: '/assets/static/cards/type2.png',
		image_bg: '/assets/static/card.png',
	},
	{
		type: 3,
		name: 'Князь',
		description: `<h1>Князь</h1><p>Баффает <b>все карты в руке</b> на <b>3 ед.силы</b>.</p>`,
		value: '15',
		image: '/assets/static/cards/type3.png',
		image_bg: '/assets/static/card.png',
		getBuff: (sel_card) => {
			battleClass.hand.forEach(card => {
				card.removeBuff(sel_card.id)
			})

			if (sel_card.active === false) {

				battleClass.selectedCards.forEach(card => {
					if (card.type !== 3) {
						card.addBuff(sel_card.id,sel_card.type,3)
					}
				})
			}
		}
	},
	{
		type: 4,
		name: 'Берсерк',
		description: `<h1>Берсерк</h1><p>Баффается <b>+20 ед.силы</b> когда выбраны <b>3 карты Берсерк</b> и нет других карт. В конце хода сбрасывает всех берсерков в колоде</p>`,
		value: '5',
		image: '/assets/static/cards/type4.png',
		image_bg: '/assets/static/card.png',
		getBuff: (sel_card) => {
			battleClass.hand.forEach(card => {
				if (card.type === 4) {
					card.removeBuff(sel_card.id)
				}
			})
			
			if (sel_card.active === true) return

			let cnt = 0
			battleClass.selectedCards.forEach(card => {
				if (card.type === 4 && card.active === false) {
					cnt++
				}
			})

			battleClass.selectedCards.forEach(card => {
				if (card.active === false && card.type === 4 && cnt === 3 && battleClass.selectedCards.length === 3) {
					let val = 0
					if (battleClass.cntSteps === battleClass.defCntSteps)
						val = 25
					else
						val = 20

					if (card.getBuffByType(sel_card.type).length === 0) card.addBuff(sel_card.id,sel_card.type,val)
				}
			})
		},
		getSkill: (sel_card) => {
			//console.log(sel_card.name)
			if (sel_card.active === true) return

			let cnt = 0

			battleClass.selectedCards.forEach(card => {
				if (card.type === 4 && card.active === false && battleClass.selectedCards.length === 3) {
					cnt++
				}

				let cnt_cards = 0
				cnt_cards = battleClass.deck.filter(card => card.type === 4).length
				
				if (cnt === 3 && cnt_cards > 0) {
					battleClass.deck = battleClass.deck.filter(card => card.type !== 4)

					messagesClass.message(`Сброшено ${cnt_cards} карт Берсерк`,'warning')
				}
			})

			battleClass.update()
		}
	},
	{
		type: 5,
		name: 'Рыцарь',
		description: `<h1>Рыцарь</h1><p>Боевая единица. Баффается от <b>Копейщицы</b>.</p>`,
		value: '12',
		image: '/assets/static/cards/type5.png',
		image_bg: '/assets/static/card.png',
	},
	{
		type: 6,
		name: 'Лучница',
		description: `<h1>Лучница</h1><p>Если лучниц в разыгрываемой руке 4 или больше, рука прибавляет <b>1 ход</b></p>`,
		value: '7',
		image: '/assets/static/cards/type6.png',
		image_bg: '/assets/static/card.png',
		getSkill: (sel_card) => {
			if (sel_card.active === true) return

			let cnt = 0

			battleClass.selectedCards.forEach(card => {
				if (card.type === 6)
					cnt++
			})

			if (cnt === battleClass.selectedCards.length) {
				const types_6 = battleClass.selectedCards.filter(card => card.type === 6)

				battleClass.selectedCards.forEach((card,i) => {
					if (types_6.length >= 4 && card === sel_card && i === types_6.length - 1) {
						battleClass.cntSteps++
						messagesClass.message(`Ход прибавлен`,'warning')
					}
				})
			}
		}
	},
	{
		type: 7,
		name: 'Доктор',
		description: `<h1>Доктор</h1><p>Баффается все карты в руке на <b>3 ед.силы</b>, если его нет в руке.</p>`,
		value: '1',
		image: '/assets/static/cards/type7.png',
		image_bg: '/assets/static/card.png',
		getBuff: (sel_card) => {
			battleClass.hand.forEach(card => {
				card.removeBuff(sel_card.id)
			})
			if (sel_card.active === false) return

			battleClass.selectedCards.forEach(card => {
				if (card.type !== 7) card.addBuff(sel_card.id,sel_card.type, 3)
			})
		}
	},
	{
		type: 8,
		name: 'Темный рыцарь',
		description: `<h1>Темный рыцарь</h1><p>При выборе карты сила Темного рыцаря равна <b>количеству карт в колоде</b>.</p>`,
		value: '1',
		image: '/assets/static/cards/type8.png',
		image_bg: '/assets/static/card.png',
		getBuff: (sel_card) => {
			if (sel_card.active === false && sel_card.getBuffByType(sel_card.type).length === 0) {
				sel_card.addBuff(sel_card.id, sel_card.type, battleClass.deck.length-1)
			} else if (sel_card.active === true) {
				sel_card.removeBuff(sel_card.id)	
			} 
		}
	},
	{
		type: 9,
		name: 'Викинг',
		description: `<h1>Викинг</h1><p>Боевая единица.</p>`,
		value: '14',
		image: '/assets/static/cards/type9.png',
		image_bg: '/assets/static/card.png',
	},
	{
		type: 10,
		name: 'Башня',
		description: `<h1>Башня</h1><p>Просто башня.</p>`,
		value: '1',
		image: '/assets/static/cards/type10.png',
		image_bg: '/assets/static/card.png',
	},
	{
		type: 11,
		name: 'Священник',
		description: `<h1>Священник</h1><p>Баффается <b>все карты в руке</b> на <b>1-5 ед.силы</b> в случайном порядке.</p>`,
		value: '1',
		image: '/assets/static/cards/type11.png',
		image_bg: '/assets/static/card.png',
		getBuff: (sel_card) => {
			battleClass.hand.forEach(card => {
				if (card.active === true) card.removeBuff(sel_card.id)
			})

			if (sel_card.active === false) return

			battleClass.selectedCards.forEach(card => {
				if (card.getBuffByType(sel_card.type) > 0 || sel_card === card) return
				const val = Math.floor(Math.random() * (5 - 1 + 1) + 1);
				card.addBuff(sel_card.id,sel_card.type, val)
			})
		}
	},
]
