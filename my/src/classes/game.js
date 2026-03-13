// Data
import { card_types } from '../data/card_types'
import { deck } from '../data/deck'
import { enemies } from '../data/enemies'
import { maps } from '../data/maps'

// Classes
import { Battle } from './battle'
import { Messages } from './messages'
import { Enemy } from './enemy'
import { User } from './user'
import { Map } from './map'

let battleClass = null
let messagesClass = new Messages(3000)
let enemies_copy = [...enemies]

class Game {
    constructor() {
        this.btn = null
        this.user = null
    }
    start() {
        this.user = new User('Player', 1)
        this.user.renderInfo()
        
        this.createBtn()
    }

    createBtn() {
        this.btn = document.createElement('button')
        this.btn.id = 'start-battle'
        // this.btn.innerText = `Победить ${enemies.length} врагов`
        this.btn.innerText = `Начать играть`
        this.btn.classList.add('button')

        this.btn.addEventListener('click', (e) => {
            this.map = new Map(maps[this.rand(0,maps.length-1)],enemies)
            this.map.render()
            this.map.closable(false, 'Покинуть карту')

            this.map.addEventListener('click_enemy', (enemyData) => {
                // const current = enemies.findIndex(enemyData)
                this.initBattle(enemyData)
            })

            this.map.addEventListener('map_end', () => {
                setTimeout(() => {
                    messagesClass.message('Все враги убиты!', 'warning')
                }, 2000)

                // setTimeout(() => {
                //     this.btn.innerHTML = `Перезапустить карту`
                //     this.btn.addEventListener('click', () => window.location.reload())
                //     this.map.hide()
                // }, 2000)
            })
        })

        document.querySelector('#app').appendChild(this.btn)
    }

    initBattle(enemyData) {
        const enemy = new Enemy(enemyData.name, this.rand(enemyData.health-20,enemyData.health), enemyData.description, enemyData.image, enemyData.image_bg)

        battleClass = new Battle(deck,card_types, enemy)

        battleClass.addEventListener('end', () => {
            this.map.show()
        })

        battleClass.addEventListener('start', () => {
            this.map.hide()
        })

        battleClass.addEventListener('victory', () => {
            let points = (this.map.enemies[this.map.currentEnemy].health) + (battleClass.cntSteps*10)
            this.user.addPoints(points)
            this.user.update()
            messagesClass.message(`Добавлено ${points} очков`)

            this.map.disableEnemy()

            this.map.currentEnemyNext()
            this.map.activeCurrentEnemy()
        })
        battleClass.addEventListener('defeat', () => {
            let points = 0
            this.user.addPoints(points)
            this.user.update()
            messagesClass.message(`Добавлено ${points} очков`,'error')
        })

        battleClass.start()
        battleClass.closable(() => {
            battleClass.removeInfoDeck()
            battleClass.destroy()
            this.map.show()
        }, 'Сбежать')
    }

    rand (min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }
}

export { Game, battleClass, messagesClass }