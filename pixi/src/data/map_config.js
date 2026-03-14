// Конфигурация отображения врагов на карте
// Настраивай эти значения для выравнивания элементов
import { colors } from './colors.js'
import { hexToPixi } from './helpers.js'

export { hexToPixi }

export const mapConfig = {
  enemy: {
    // Максимальная высота спрайта врага (в пикселях)
    maxHeight: 120,
    
    // Смещение по Y для всех элементов врага
    offsetY: 0,
    
    // Дополнительное смещение спрайта относительно offsetY
    // Положительное = ниже, отрицательное = выше
    spriteOffsetY: 20,
    
    // Платформа (круг под врагом)
    platform: {
      // Радиус круга
      radius: 45,
      // Смещение круга по Y
      offsetY: 0,
      // Цвета платформы из colors.js
      colors: {
        defeated: colors.enemy.platform.defeated,
        active: colors.enemy.platform.active,
        default: colors.enemy.platform.default
      }
    },
    
    // Кольцо вокруг врага (из colors.js)
    ring: {
      // Радиус кольца
      radius: 50,
      // Смещение по Y
      offsetY: 0,
      // Толщина линии
      lineWidth: 3,
      // Цвета из colors.js (будут использоваться в renderEnemies)
      colors: colors.enemy.ring
    },
    
    // Позиция имени врага
    name: {
      // Смещение от спрайта (отрицательное = выше)
      offsetY: 45
    },
    
    // Позиция здоровья
    health: {
      // Фон здоровья
      bg: {
        width: 50,
        height: 20,
        offsetY: 50
      },
      // Текст здоровья
      text: {
        offsetY: 60
      }
    },
    
    // Позиция текста "Побежден"
    defeated: {
      offsetY: 90
    }
  }
}
