export class Card {
	constructor (name, value, type, description = '') {
		this._name = name
		this._value = value
		this._type = type
		this._description = description

		this._default_value = value
	
		this._active = false
		this._id = 'card_'+Math.random().toString(16).slice(2)
		this._image = 'img/cards/type1.png'
		this._image_bg = 'img/card.png'
		this._el = null

		this._buffs = []
	}

	render () {
		const el_cards = document.querySelector('#app .hand')
		const el_card = document.createElement('div')
		
		const el_card_value = document.createElement('span')
		el_card_value.innerHTML = this.getValue()
		el_card_value.classList.add('card-value')

		if (this._description !== '') {
			const el_card_descr = document.createElement('div')
			el_card_descr.innerHTML = this._description
			el_card_descr.classList.add('card-desciption')

			el_card.append(el_card_descr)
		}

		const el_card_name = document.createElement('span')
		el_card_name.innerHTML = this._name
		el_card_name.classList.add('card-name')

		const el_card_image = document.createElement('div')
		el_card_image.classList.add('card-image')
		el_card_image.style.backgroundImage = 'url('+this._image+')'
		
		el_card.id = this._id
		el_card.classList.add('card')
		el_card.style.backgroundImage = 'url('+this._image_bg+')'

		el_card.append(el_card_value)
		el_card.append(el_card_name)
		el_card.append(el_card_image)
		el_cards.append(el_card)

		this._el = el_card
	}

	update () {
		if (!this._el) return
		this._el.querySelector('.card-value').innerHTML = this.getValue()

		if (this._buffs.length > 0) {
			this._el.classList.add('buff')
		}else{
			this._el.classList.remove('buff')
		}
	}


	get id () {
		return this._id
	}

	get element () {
		return this._el
	}

	get type () {
		return this._type
	}

	get buffs () {
		return this._buff
	}

	addBuff (id, type ,buff) {
		if (this._buffs.filter(buff => buff.id === id).length > 0) return

		this._buffs.push({
			id: id,
			type: type,
			buff: buff
		})
	}

	removeBuff (id) {
		this._buffs = this._buffs.filter(buff => buff.id !== id)
	}

	removeAllBuff () {
		this._buffs = []
	}

	getBuffs () {
		return this._buffs
	}
	getBuffByType (type) {
		return this._buffs.filter(buff => buff.type === type)
	}

	getValue () {
		let value = this._value*1
		this._buffs.forEach(buff => {
			value += buff.buff*1
		})
		return value
	}

	get image () {
		return this._image
	}

	set image (image) {
		if (image === null) return
		this._image = image
	}

	get image_bg () {
		return this._image_bg
	}

	set image_bg (image) {
		if (image === null) return
		this._image_bg = image
	}

	set name (name) {
		this._name = name
	}

	get name () {
		return this._name
	}

	set value (value) {
		this._value = value
	}

	get value () {
		return this._value
	}

	set description (description) {
		this._description = description
	}

	get description () {
		return this._description
	}

	set active (active) {
		(!active) ? this._el.classList.add('selected') : this._el.classList.remove('selected')

		this._value = this._default_value
		
		this._active = active == true
	}

	get active () {
		return this._active
	}
}
