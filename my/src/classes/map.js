import { GameObject } from './gameobject'
import { mapTemplate } from '../templates/map.template'

export class Map extends GameObject {
    constructor (map, enemies) {
        super('map')
        this._map = map
        this._enemies = enemies
        this._currentEnemy = 0
        this._victories = 0
    }

    get map () {
        return this._map
    }

    get enemies () {
        return this._enemies
    }

    get currentEnemy () {
        return this._currentEnemy
    }

    currentEnemyNext () {
        this._currentEnemy++
    }

    render () {
        if (document.querySelector('#map')) {
            this.show()

            return
        }

        document.querySelector('#app').insertAdjacentHTML('beforeend', mapTemplate)
        const $map = document.querySelector('#map')
        $map.style.backgroundImage = `url(${this._map.image})`
        $map.querySelector('.map-title').innerHTML = this._map.name

        const $cells = document.querySelector('#map .map-cells')
        // grid-template-columns: repeat(10, 1fr);
        // grid-template-rows: repeat(10, 1fr);
        $cells.style.gridTemplateColumns = `repeat(${this._map.segments}, 1fr)`
        $cells.style.gridTemplateRows = `repeat(${this._map.segments}, 1fr)`

        for (let i = 0; i < this._map.segments*this._map.segments; i++) {
            const $cell = document.createElement('div')
            $cell.classList.add('map-cell')
            $cell.id = 'cell_'+i
            $cell.addEventListener('click', (e) => {
                console.log(e.target.id)
            })

            $cells.append($cell)
        }

        this.renderEnemies()

        this.activeCurrentEnemy()

        setTimeout(() => {
            this.show()
        }, 200);
    }

    renderEnemies () {
        this._map.places.forEach((place, i) => {
            // console.log(this._map.places[i])
            if (this._enemies[i] === undefined) return

            const $cell = document.querySelector(`#${this._map.places[i]}`)

            if (!$cell) return

            $cell.classList.add('hidden')
            
            if (this._enemies.length === i+1) {
                $cell.classList.add('boss')
            }
            
            const $place = document.createElement('div')
            $place.classList.add('place')

            const $enemy = document.createElement('div')
            $enemy.classList.add('enemy')
            $enemy.style.backgroundImage = `url(${this._enemies[i].image})`

            const $health = document.createElement('div')
            $health.classList.add('enemy-health')
            $health.innerHTML = '~' + this._enemies[i].health

            $place.append($health)

            const $name = document.createElement('div')
            $name.classList.add('enemy-name')
            $name.innerHTML = this._enemies[i].name

            $place.append($name)

            $place.append($enemy)
            $cell.append($place)

            $place.addEventListener('click', () => {
                if ($cell.classList.contains('disabled') || $cell.classList.contains('hidden')) return

                this.dispatch('click_enemy', this._enemies[i])
            })
        })
    }

    activeCurrentEnemy () {
        const enemy = document.querySelector(`#${this._map.places[this._currentEnemy]}`)
        if (!enemy) return

        document.querySelector(`#${this._map.places[this._currentEnemy]}`).classList.remove('hidden')
    }

    disableEnemy () {
        this._victories++
       
        document.querySelector(`#${this._map.places[this._currentEnemy]}`).classList.add('disabled')

        if (this._enemies.length === this._victories) {
            this.dispatch('map_end')
        }
    }
}