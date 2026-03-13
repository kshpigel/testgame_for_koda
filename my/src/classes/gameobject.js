export class GameObject {
    constructor (id) {
		this.id = id
        this.events = []
    }

    dispatch (event, data = null) {
        if (!this.events[event]) return
        
		if (this.events[event].length > 0) {
			this.events[event].forEach(callback => callback(data))
		}
	}

	addEventListener (event, callback) {
        if (!this.events[event]) this.events[event] = []

		this.events[event].push(callback)
	} 

	show () {
		this.dispatch('show')

		document.querySelector('#'+this.id).classList.add('show')
		this.bgEffect()
	}

	hide () {
		this.dispatch('hide')
		
		document.querySelector('#'+this.id).classList.remove('show')
		this.bgEffect()
	}

	bgEffect () {
		const $screens =  document.querySelectorAll('.screen.show')
		const $app = document.querySelector('#app')
		
		if ($screens.length <= 0) {
			if ($app.classList.contains('bg')) $app.classList.remove('bg')
		} else {
			if (!$app.classList.contains('bg')) $app.classList.add('bg')
		}
	}

	destroy () {
		if (!document.querySelector(`#${this.id}`)) return
		this.dispatch('destroy')
		
        //document.querySelector(`#${this.id}`).classList.remove('show')
		this.hide()

        setTimeout(() => {
            document.querySelector(`#${this.id}`).remove()
        }, 500)
    }

	closable (callback = false, label = 'Закрыть') {
		const $screen = document.querySelector('#'+this.id)

		const $close = document.createElement('div')
		$close.classList.add('screen-close')
		$close.innerHTML = '&times;'
		$close.addEventListener('click', () => {
			if (callback) {
				callback()
			} else {
				this.destroy()
			}
		})


		const $label = document.createElement('div')
		$label.classList.add('screen-close-label')
		$label.innerHTML = label

		$close.append($label)
		$screen.append($close)
	}
}