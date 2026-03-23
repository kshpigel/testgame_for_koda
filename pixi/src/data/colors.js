// Все цвета проекта в одном месте

// Конвертация HEX строки в число Pixi
function hexToPixi(hex) {
  if (typeof hex === 'number') return hex
  if (typeof hex === 'string' && hex.startsWith('#')) {
    return parseInt(hex.slice(1), 16)
  }
  return hex
}

// Рекурсивная конвертация всех строковых цветов в объекте
function convertColors(obj) {
  if (typeof obj === 'string') return hexToPixi(obj)
  if (typeof obj !== 'object' || obj === null) return obj
  
  const result = {}
  for (const key in obj) {
    result[key] = convertColors(obj[key])
  }
  return result
}

// Градиенты храним как строки (не конвертируем в числа Pixi)
const gradientColorsData = {
  card: {
    // Glow эффект карты (для анимации перелива) - предустановленные цвета
    glow1: '#D60404', // красный
    glow2: '#D60446', // оранжевый (вернул)
    circle: {
      normal: { center: '#67B560', edge: '#0C1B11' },
      selected: { center: '#EE40D7', edge: '#3B0C32' },
      buffed: { center: '#EE40D7', edge: '#3B0C32' },
      debuffed: { center: '#C02828', edge: '#600808' },
      dark: { center: '#3C3C44', edge: '#1C1C22' }
    }
  },
  button: {
    // Радиальные градиенты кнопок: center -> mid -> edge
    red: { center: '#C02828', mid: '#801818', edge: '#600808' },
    green: { center: '#4a9c4a', mid: '#2d5a2d', edge: '#1a3a1a' },
    redHover: { center: '#901818', mid: '#701010', edge: '#400606' },
    greenHover: { center: '#2d5a2d', mid: '#1a3a1a', edge: '#0a1a0a' }
  }
}

// Экспортируем градиенты отдельно (как строки)
export const gradientColors = gradientColorsData

const colorsData = {
  // Фоны
  background: {
    battle: '#1a1a2e',
    map: '#2d4a3e',
    main: '#1a1a2e'
  },
  
  // Враги на карте
  enemy: {
    platform: {
      defeated: '#333333',
      active: '#39751b',
      default: '#282424',
      locked: '#1a1a1a'
    },
    ring: {
      boss: '#8c1300',
      active: '#39751b',
      default: '#4a6b5c',
      defeated: '#333333',
      easy: '#39751b',
      medium: '#6b8c19',
      strong: '#8c5a00',
      very_strong: '#a83200'
    },
    healthBg: '#000000'
  },
  
  // Карты в бою
  card: {
    background: {
      normal: '#3a3a3a',
      selected: '#4a7c4a',
      hover: '#4a5a4a',
      disabled: '#222222'
    },
    border: {
      normal: '#666666',
      selected: '#4a9c6d',
      hover: '#5a8c5a',
      white: '#F5E7CF',
      disabled: '#444444'
    },
    highlight: '#00ff00',
    value: {
      normal: '#F5E7CF',
      buffed: '#00ff00'
    },
    circle: {
      normal: '#39751b',
      buffed: '#8a2791',
      border: '#F5E7CF'
    }
  },
  
  // UI
  ui: {
    button: {
      play: '#39751b',
      reset: '#8c1300',
      exit: '#8c1300',
      hover: '#255a25',
      shadow: '#000000',
      white: '#F5E7CF'
    },
    panel: {
      bg: '#282424',
      border: '#4a9c6d'
    },
    cardBack: {
      normal: '#282424',
      borderNormal: '#F5E7CF',
      hover: '#3a5a4a',
      borderHover: '#4a9c6d'
    },
    circle: {
      bg: '#000000',
      border: '#666666'
    },
    text: {
      primary: '#F5E7CF',
      secondary: '#cccccc',
      damage: '#ff4444',
      victory: '#00ff00',
      defeat: '#ff0000',
      gold: '#ffd700',
      crystals: '#00bfff'
    }
  },
  
  // Map
  map: {
    grid: '#FF00FF', // magenta для отличия от debug сетки
    platform: {
      defeated: '#666666',
      active: '#00ff00',
      locked: '#ff6600'
    }
  }
}

export const colors = convertColors(colorsData)
