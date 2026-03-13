export class Enemy {
    constructor (name, health, description = '', image = '', image_bg = '') {
        this._name = name
        this._health = health
        this._description = description
        this._id = 'enemy_'+Math.random().toString(16).slice(2)
        this._image = image
        this._image_bg = image_bg


        this.element = null

        this.prize = 100
    }

    renderEnemy () {
        const el_card = document.createElement('div')
        el_card.classList.add('enemy')

        const el_card_image = document.createElement('img')
        el_card_image.src = this._image

        const el_card_name = document.createElement('div')
        el_card_name.classList.add('enemy-name')
        el_card_name.innerHTML = this._name

        const el_card_health = document.createElement('div')
        el_card_health.classList.add('enemy-health')
        el_card_health.innerHTML = this._health

        el_card.append(el_card_image)
        el_card.append(el_card_name)
        el_card.append(el_card_health)
        document.querySelector('#enemies').append(el_card)

        this.element = el_card
    }

    renderBattle () {
        if (!document.querySelector('#battle')) return
        
        const el_battle = `<div class="enemy-block" style="background-image: url(${this._image_bg})">
            <h1>${this._name}</h1>
            <div id="enemy-health" class="need"><span>${this._health}</span></div>
            <div id="result" class="result"><span>0</span></div>
            <div class="enemy">
                <div class="health">${this._health}</div>
                <img src="${this._image}" alt="" />
            </div>
        </div>`

        document.querySelector('#battle').insertAdjacentHTML('afterbegin', el_battle)
    }

    get id () {
        return this._id
    }

    get name () {
        return this._name
    }

    get health () {
        return this._health
    }

    get description () {
        return this._description
    }

    get image () {
        return this._image
    }

    get image_bg () {
        return this._image_bg
    }
}