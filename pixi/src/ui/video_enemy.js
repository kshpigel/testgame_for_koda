import * as PIXI from 'pixi.js'
import { UINode } from './ui_node.js'
import { log } from '../data/config.js'

/**
 * VideoEnemy - отображение врага как видео с прозрачным фоном
 * Использует WebM видео с альфа-каналом
 */
export class VideoEnemy extends PIXI.Container {
  constructor(app, options = {}) {
    super()
    
    const {
      videoPath,
      width = 300,
      height = 280,
      loop = true,
      autoplay = true
    } = options

    this.app = app
    this.videoPath = videoPath
    this._width = width
    this._height = height
    this.loop = loop
    this.autoplay = autoplay
    this.videoElement = null
    this.texture = null
    this.sprite = null

    this.create()
  }

  create() {
    console.log('VideoEnemy.create() called, videoPath:', this.videoPath)
    
    // Отладочная рамка вокруг всего контейнера (большая, чтобы точно было видно)
    const debugBorder = new PIXI.Graphics()
    debugBorder.lineStyle(5, 0x00FF00, 1)
    debugBorder.drawRect(-200, -350, 400, 350)
    this.addChild(debugBorder)
    console.log('Debug border added, children count:', this.children.length)
    
    // Создаем HTML видео элемент
    this.videoElement = document.createElement('video')
    this.videoElement.src = this.videoPath
    this.videoElement.loop = true
    this.videoElement.muted = true
    this.videoElement.playsInline = true
    
    // Заглушка (большая, красная)
    const placeholder = new PIXI.Graphics()
    placeholder.beginFill(0xFF0000, 0.8)
    placeholder.drawRect(-150, -280, 300, 280)
    placeholder.endFill()
    this.addChild(placeholder)
    console.log('Placeholder added, children count:', this.children.length)
    
    // Все события видео
    this.videoElement.addEventListener('loadstart', () => {
      console.log('Video loadstart')
    })
    
    this.videoElement.addEventListener('loadedmetadata', () => {
      console.log('Video loadedmetadata, width:', this.videoElement.videoWidth, 'height:', this.videoElement.videoHeight)
    })
    
    this.videoElement.addEventListener('loadeddata', () => {
      console.log('Video loadeddata event fired, dimensions:', this.videoElement.videoWidth, 'x', this.videoElement.videoHeight)
      console.log('Children before cleanup:', this.children.length)
      const placeholderRemoved = this.removeChild(placeholder)
      const debugRemoved = this.removeChild(debugBorder)
      console.log('Removed placeholder:', placeholderRemoved, 'debugBorder:', debugRemoved)
      console.log('Children after cleanup:', this.children.length)
      this.initTexture()
    })
    
    this.videoElement.addEventListener('canplay', () => {
      console.log('Video canplay')
    })
    
    this.videoElement.addEventListener('canplaythrough', () => {
      console.log('Video canplaythrough')
    })

    this.videoElement.addEventListener('error', (e) => {
      console.error('Video error event:', this.videoPath, e, this.videoElement.error)
      debugBorder.lineStyle(5, 0xFF0000, 1)
    })

    if (this.autoplay) {
      this.videoElement.play().then(() => {
        console.log('Video autoplay started')
      }).catch(err => {
        console.error('Video autoplay failed:', err)
      })
    }
  }

  initTexture() {
    // Создаём текстуру из видео
    this.texture = PIXI.Texture.from(this.videoElement)
    
    // Создаем спрайт с видео
    this.sprite = new PIXI.Sprite(this.texture)
    
    console.log('Before anchor: texture size', this.texture.width, 'x', this.texture.height)
    
    // Anchor: центр (0.5, 0.5)
    this.sprite.anchor.set(0.5, 0.5)
    
    console.log('After anchor, before fit: sprite size', this.sprite.width, 'x', this.sprite.height)
    
    // Масштабируем видео, чтобы вписаться в контейнер
    this.fitVideo()
    
    console.log('After fitVideo: sprite scale', this.sprite.scale.x, 'x', this.sprite.scale.y)
    console.log('After fitVideo: sprite size', this.sprite.width, 'x', this.sprite.height)
    
    // Спрайт в центре VideoEnemy (0, 0)
    this.sprite.x = 0
    this.sprite.y = 0
    
    // Добавляем в контейнер
    this.addChild(this.sprite)
    
    // Запускаем видео
    this.videoElement.play().catch(err => console.error('Video play error:', err))
  }

  fitVideo() {
    if (!this.sprite || !this.videoElement) return

    // Используем реальные размеры видео
    const videoWidth = this.videoElement.videoWidth
    const videoHeight = this.videoElement.videoHeight
    
    if (!videoWidth || !videoHeight) {
      console.error('fitVideo: video dimensions not available', videoWidth, videoHeight)
      this.sprite.scale.set(0.4)
      return
    }
    
    // Масштабируем по меньшей стороне, чтобы видео вписалось полностью
    const scaleWidth = this._width / videoWidth
    const scaleHeight = this._height / videoHeight
    const scale = Math.min(scaleWidth, scaleHeight)
    
    this.sprite.scale.set(scale)
  }

  /**
   * Перезапускает видео с начала
   */
  restart() {
    if (this.videoElement) {
      this.videoElement.currentTime = 0
      this.videoElement.play().catch(() => {})
    }
  }

  /**
   * Останавливает видео
   */
  pause() {
    if (this.videoElement) {
      this.videoElement.pause()
    }
  }

  /**
   * Возобновляет видео
   */
  resume() {
    if (this.videoElement && this.videoElement.paused) {
      this.videoElement.play().catch(() => {})
    }
  }

  /**
   * Освобождает ресурсы
   */
  dispose() {
    if (this.sprite) {
      this.sprite.destroy()
      this.sprite = null
    }

    if (this.texture) {
      this.texture.destroy(true)
      this.texture = null
    }

    if (this.videoElement) {
      this.videoElement.pause()
      this.videoElement.src = ''
      this.videoElement.load()
      this.videoElement = null
    }
  }
}
