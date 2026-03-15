export class User {
    _name
    _id
    _points

    constructor(name, id) {
        this._name = name
        this._id = id
        this._points = 0
    }

    get name () {
        return this._name
    }

    get id () {
        return this._id
    }

    get points () {
        return this._points
    }

    set points (points) {
        this._points = points*1
    }

    addPoints (points) {
        this._points += points*1
    }

    renderInfo () {
        const app = document.querySelector('#app')
        
        const info = document.createElement('div')
        info.classList.add('user-info')

        const name = document.createElement('div')
        name.classList.add('user-name')
        name.innerHTML = this._name

        const points = document.createElement('div')
        points.classList.add('user-points')
        points.innerHTML = this._points

        info.append(name)
        info.append(points)

        app.append(info)
    }

    update() {
        document.querySelector('.user-points').innerHTML = this._points
    }
}