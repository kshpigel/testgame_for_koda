import { GameObject } from './gameobject'

import { Card } from './card'
import { battleTemplate } from '../templates/battle.template'
import { deckTemplate } from '../templates/deck.template'

import { messagesClass } from './game'

export class Battle extends GameObject {
	maxCards = 5 // Максимальное число активных карт
	activeCards = 0 // Кол-во активных карт
	interval = 100 // Шаг интервала анимации
	result = 0 // Результат
	health = 120 // здоровье противника
	deck = [] // Колода
	hand = [] // Рука 
	cardTypes = [] // Типы карт
	cntCards = 8 // Кол-во карт в руке
	selectedCards = [] // Выбранные карты
	defCntReset = 3 // кол-во сбросов по умолчанию
	defCntSteps = 4 // кол-во шагов по умолчанию
	cntReset = 0 // кол-во сбросов
	cntSteps = 0 // кол-во шагов
	enemy = null // Класс врага

	stopPlay = false // Остановить ход

	drag = {
		on: false,
		element: null,
		start: []
	}

	constructor (deck, types, enemy) {
		super('battle')

		this.deck = deck
		this.cardTypes = types
		this.cntReset = this.defCntReset
		this.cntSteps = this.defCntSteps
		this.enemy = enemy

		return this
	}

	update () {
		this.updateInfoDeck()

		document.querySelector('#result').innerHTML = this.result
		document.querySelector('.card.deck .card-value').innerHTML = this.deck.length
		document.querySelector('#enemy-health').innerHTML = this.health
		document.querySelector('#resets').innerHTML = this.cntReset
		document.querySelector('#steps').innerHTML = this.cntSteps

		this.hand.forEach(card => card.update())
	}

	randValue (min,max) { 
		return Math.floor(Math.random() * (max - min + 1) + min)
	}

	getDeck () {
		let tmp_deck = []
		for (let i=0; i < this.deck.length; i++) {
			tmp_deck.push(this.cardTypes.filter(type => type.type === this.deck[i])[0])
		}

		return tmp_deck
	}

	start () {
		if (document.querySelector('#battle'))
			return

		this.dispatch('start')

		window.addEventListener('mouseup',(e) => {
			this.drag.element = null
			this.hand.forEach(c => {
				if (!c.element) return
				(c.element.classList.contains('drag')) ? c.element.classList.remove('drag') : null
			})
			this.drag.on = false
			this.drag.start = []
		})
		window.onmousemove = (e) => {
			if (this.drag.on) {
				const shift = Math.round(this.drag.element.offsetWidth*0.7)
				const prntX = document.querySelector('#battle').offsetLeft*1 - (document.querySelector('#battle').offsetWidth*0.5)

				if (this.drag.start.length <= 0) 
					this.drag.start = [this.drag.element.offsetLeft + prntX, e.pageY]
				
				if (e.pageX < this.drag.start[0]) {
					if (!this.drag.element.previousSibling) return
					this.drag.element.parentNode.insertBefore(this.drag.element,this.drag.element.previousSibling)
					this.drag.start[0] = this.drag.element.offsetLeft + prntX
				}else if (e.pageX > this.drag.start[0] + shift*1.5){
					if (!this.drag.element.nextSibling) return
					this.drag.element.parentNode.insertBefore(this.drag.element.nextSibling,this.drag.element)
					this.drag.start[0] = this.drag.element.offsetLeft + prntX
				}

				//console.log(prntX, this.drag.element.offsetLeft)
			}
		}

		if (document.querySelector('#battle')) document.querySelector('#battle').remove()

		document.querySelector('#app').insertAdjacentHTML('beforeend', battleTemplate)
		
		setTimeout(() => this.show(), 100)

		this.enemy.renderBattle()

		document.querySelector('#reset-cards').addEventListener('click', (e) => {
			this.resetCards()
		})
		document.querySelector('#play-cards').addEventListener('click', (e) => {
			this.stepPlay()
		})
		document.querySelectorAll('.message-content').forEach((el) => {
			el.addEventListener('click', (e) => {
				this.end()
			})
		})

		this.deck = this.getDeck()
		this.deck.sort(() => Math.random() - 0.5)
		this.giveHand(this.cntCards)
		this.health = this.enemy.health
		//this.health = this.randValue(this.defCntSteps*this.maxCards*10,this.defCntSteps*this.maxCards*20)

		this.infoDeck()

		this.update()

		messagesClass.message(`Битва началась!`,`warning`)
	}

	end () {
		this.dispatch('end')

		this.removeInfoDeck()

		this.destroy()
	}

	giveHand (cnt) {
		cnt = (this.deck.length < cnt) ? this.deck.length : cnt

		//console.log(cnt)
		
		for (let i = 1; i <= cnt; i++) {
			// const interval = this.interval * i
			// setTimeout(() => {
			const cntDeck = this.deck
			const currCard = this.deck[cntDeck.length-1]
			this.addCard(currCard)
			this.deck.splice(cntDeck.length-1,1)
			// },interval)
		}

		this.update()
		this.renderCards()
	}

	renderCards () {
		this.hand.sort((a, b) => a.value*1 > b.value*1 ? 1 : -1)

		let i = 0
		this.hand.forEach(card => {
			if (document.querySelector('#'+card.id)) return

			const interval = this.interval * i
			i++
			setTimeout(() => {
				card.render()
				card.active = true
				card.element.style.animationDelay = this.randValue(0,this.hand.length)*this.interval/500 + 's';

				setTimeout(() => { card.element.classList.add('show') },this.interval)

				card.element.addEventListener('mousedown',(e) => {
					this.drag.element = card.element
					card.element.classList.add('drag')
					this.drag.on = true
				})
				
				card.element.addEventListener('click',(e) => {
					if (card.active) {
						if (this.activeCards >= this.maxCards) return

						this.dispatch('select')
						
						this.selectedCards.push(card)

						this.activeCards++
						card.active = false
					}else{
						this.selectedCards = this.selectedCards.filter(sCard => sCard.id !== card.id)
						this.activeCards--
						card.active = true
					}

					this.buff(card)
					
					this.update()
					//console.log(card.active,card,this.result)
				})
			},interval)
		})

		this.update()
	}

	addCard (_card) {
		//console.log(_card)
		const card = new Card(_card.name, _card.value, _card.type)
		if (_card.image) card.image = _card.image
		if (_card.image_bg) card.image_bg = _card.image_bg
		if (_card.description) card.description = _card.description

		const card_type = this.cardTypes.filter(t => t.type === _card.type)[0]
		
		if (card_type.getBuff) card.getBuff = card_type.getBuff
		if (card_type.getSkill) card.getSkill = card_type.getSkill
		// card.render()
		// card.active = true

		this.hand.push(card)
	}

	removeCard (id) {
		this.hand = this.hand.filter(card1 => card1.id !== id)
		setTimeout(() => {
			//console.log(id)
			document.querySelector('#'+id).classList.remove('show')
			setTimeout(() => { 
				document.querySelector('#'+id).remove()
			},this.interval)
			this.update()
		},this.interval)
	}

	stepPlay () {
		if (this.stopPlay === true) return
		if (this.cntSteps <= 0) return
		if (this.selectedCards.length <= 0) return
		
		this.dispatch('play')

		this.stopPlay = true
		
		const cntSelected = this.selectedCards.length
		let summ = 0

		// Вызываем метод getSkill
		this.hand.forEach((sel_card) => {
			if (sel_card.getSkill) sel_card.getSkill(sel_card)
		})

		//if (cntSelected >= this.hand.length + this.deck.length) return
		
		for (let i=0; i < cntSelected; i++) {
			summ += this.selectedCards[i].getValue()
		}

		this.health -= summ

		messagesClass.message(`Сделан ход на ${summ} ед. силы`)

		setTimeout(() => document.querySelector('#result').classList.remove('bang'),1000)
		document.querySelector('#result').classList.add('bang')

		if (this.health < 0) this.health = 0
		this.cntSteps--
		if (this.health === 0) {
			this.dispatch('victory')
			setTimeout(()=> document.querySelector('#victory').classList.add('show'), 1000)
			messagesClass.message(`Вы победили!`, 'warning')
		} else if (this.cntSteps <= 0) {
			this.dispatch('defeat')
			setTimeout(()=> document.querySelector('#fail').classList.add('show'), 1000)
			messagesClass.message(`Вы проиграли!`, 'error')
		}

		this.resetCards(false)

		setTimeout(() => { this.stopPlay = false }, 1200)
	
	}

	buff () {
		this.hand.forEach((sel_card) => {
			if (sel_card.getBuff) sel_card.getBuff(sel_card)
		})

		this.result = 0
		this.selectedCards.forEach((card) => {
			this.result += card.getValue()
		})
	}

	resetCards (isReset = true) {
		if (this.selectedCards.length <= 0) return
		const cntSelected = this.selectedCards.length
		if (cntSelected >= this.hand.length + this.deck.length) return
		if (this.cntReset <= 0 && isReset) return
		
		for (let i=0; i < cntSelected; i++) {
			this.removeCard(this.selectedCards[i].id)
		}

		if (isReset) this.cntReset--
		this.giveHand(cntSelected)
		this.selectedCards = []
		this.result = 0
		this.activeCards = 0
		this.update()
	}

	infoDeck() {
		document.querySelector('#app').insertAdjacentHTML('beforeend', deckTemplate)
		const card_types = document.querySelector('#deck-info .card-types')

		document.querySelector('#app .deck-block .deck').addEventListener('click',() => { document.querySelector('#deck-info').classList.add('show') })
		document.querySelector('#deck-info .close').addEventListener('click',() => { document.querySelector('#deck-info').classList.remove('show') })
		document.querySelector('#deck-info h2').insertAdjacentHTML('beforeend', `<span class="cards-length">${this.deck.length}</span>`)

		window.addEventListener('keyup',(e) => { if (e.keyCode === 27) document.querySelector('#deck-info').classList.remove('show') })

		this.cardTypes.forEach((card_type) => {
			const cntCards = this.deck.filter(card => card.type === card_type.type).length

			if (cntCards <= 0) return
			//const disabled = (cntCards <= 0) ? ' disabled' : ''
			
			card_types.insertAdjacentHTML('beforeend', `
				<div id="card-type-${card_type.type}" class="card-type" data-type="${card_type.type}">
					<div class="card-type-image"><img src="${card_type.image}" alt="" /></div>
					<div class="card-type-name">${card_type.name}</div>
					<div class="card-type-value">${card_type.value}</div>
					<div class="card-type-cnt">${cntCards}</div>
					<div class="card-type-desciption">${card_type.description}</div>
				</div>
			`)
		})
	}

	updateInfoDeck() {
		if (!document.querySelector('#deck-info')) return

		document.querySelector('#deck-info h2 .cards-length').innerHTML = this.deck.length

		this.cardTypes.forEach((card_type) => {
			const cntCards = this.deck.filter(card => card.type === card_type.type).length
			
			if (!document.querySelector(`#card-type-${card_type.type}`)) return

			if (cntCards <= 0) document.querySelector(`#card-type-${card_type.type}`).classList.add('disabled')

			document.querySelector(`#card-type-${card_type.type} .card-type-cnt`).innerHTML = cntCards
		})
	}

	removeInfoDeck() {
		if (document.querySelector('#deck-info')) {
			document.querySelector('#deck-info').remove()
		}
	}
}
