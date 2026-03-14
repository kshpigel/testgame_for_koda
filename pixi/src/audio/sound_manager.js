const SOUNDS = {
  hover: { src: '/assets/sounds/hover.mp3', start: 0.1 },
  click: { src: '/assets/sounds/click.mp3', start: 0.5 },
  battleStart: { src: '/assets/sounds/battle_start.mp3', start: 0.1 },
  attack: { src: '/assets/sounds/attack.mp3', start: 0.1 },
  battleVictory: { src: '/assets/sounds/battle_victory.mp3', start: 4 },
  battleFail: { src: '/assets/sounds/battle_fail.mp3', start: 0.1 },
  mapBg: { src: '/assets/sounds/map_bg.mp3', start: 0 },
  musicBg: { src: '/assets/sounds/music_bg.mp3', start: 0 }
}

class SoundManager {
  constructor() {
    this.buffers = {}
    this.audioCtx = null
    this.currentMusic = null
    this.musicVolume = 0.5
    this.sfxVolume = 0.7
    this.musicEnabled = true
    this.sfxEnabled = true
  }

  async init() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    
    // "Разогрев" AudioContext
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume()
    }
    
    // Предзагрузка звуков
    for (const [name, config] of Object.entries(SOUNDS)) {
      try {
        const response = await fetch(config.src)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer)
        this.buffers[name] = audioBuffer
      } catch (e) {
        console.warn(`Sound ${name} not loaded:`, e)
      }
    }
  }

  play(name) {
    if (!this.sfxEnabled || !this.buffers[name] || !this.audioCtx) return
    
    const config = SOUNDS[name]
    const startMs = config?.start || 0
    const offset = startMs / 1000 // конвертируем мс в секунды
    
    // Создаём источник для возможности наложения звуков
    const source = this.audioCtx.createBufferSource()
    source.buffer = this.buffers[name]
    source.connect(this.audioCtx.destination)
    source.volume = this.sfxVolume
    source.start(0, offset) // start(when, offset)
  }

  playMusic(name, loop = true) {
    if (!this.musicEnabled || !this.buffers[name] || !this.audioCtx) return
    
    const config = SOUNDS[name]
    const startMs = config?.start || 0
    const offset = startMs / 1000
    
    // Остановить текущую музыку
    this.stopMusic()
    
    this.currentMusic = this.audioCtx.createBufferSource()
    this.currentMusic.buffer = this.buffers[name]
    this.currentMusic.loop = loop
    
    const gainNode = this.audioCtx.createGain()
    gainNode.gain.value = this.musicVolume
    
    this.currentMusic.connect(gainNode)
    gainNode.connect(this.audioCtx.destination)
    this.currentMusic.start(0, offset)
  }

  stopMusic() {
    if (this.currentMusic) {
      try {
        this.currentMusic.stop()
      } catch (e) {}
      this.currentMusic = null
    }
  }

  setMusicVolume(vol) {
    this.musicVolume = vol
  }

  setSfxVolume(vol) {
    this.sfxVolume = vol
  }

  toggleMusic(enabled) {
    this.musicEnabled = enabled
    if (!enabled) {
      this.stopMusic()
    }
  }

  toggleSfx(enabled) {
    this.sfxEnabled = enabled
  }
}

export const soundManager = new SoundManager()
