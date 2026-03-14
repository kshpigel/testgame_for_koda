// Все цвета проекта в одном месте

export const colors = {
  // Фоны
  background: {
    battle: 0x1a1a2e,
    map: 0x2d4a3e,
    main: 0x1a1a2e
  },
  
  // Враги на карте
  enemy: {
    platform: {
      defeated: 0x333333,
      active: 0x39751b,    // зелёный - текущий враг
      default: 0x282424,   // серый - обычный
      locked: 0x1a1a1a     // тёмный - заблокирован
    },
    ring: {
      boss: '#8c1300',     // красный - босс
      active: '#39751b',   // зелёный - активный
      default: '#4a6b5c',  // тускло-зелёный - обычный
      defeated: '#333333'  // серый - побеждён
    }
  },
  
  // Карты в бою
  card: {
    background: 0x2a2a4a,
    border: 0x333333,
    highlight: 0x00ff00,
    value: {
      normal: '#ffffff',
      buffed: '#00ff00'
    }
  },
  
  // UI
  ui: {
    button: {
      play: 0x39751b,
      reset: 0x8c1300,
      exit: 0x8c1300,
      hover: 0xa52a2a
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
      damage: '#ff4444',
      victory: '#00ff00',
      defeat: '#ff0000'
    }
  }
}
