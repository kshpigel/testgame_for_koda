import { messagesTemplate } from '../templates/messages.template'
export class Messages {
    constructor (interval) {
        document.querySelector('#app').insertAdjacentHTML('beforeend', messagesTemplate)
        this.interval = interval
    }

    message ( text, type = 'info' ) {
        const messages = document.querySelector('#messages')

        const message = document.createElement('div')
        message.classList.add('message')
        message.classList.add(type)
        message.innerHTML = `<div class="message-content">${text}</div>`

        messages.appendChild(message)

        setTimeout(() => {
            message.classList.add('show')
        },100)

        setTimeout(() => {
            message.classList.remove('show')
        },this.interval)

        setTimeout(() => {
            message.remove()
        },this.interval+500)
    } 
}