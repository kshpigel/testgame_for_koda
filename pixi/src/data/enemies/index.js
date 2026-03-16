// Автоимпорт всех врагов
const modules = import.meta.glob('./*.js', { eager: true })
console.log('ENEMY modules raw:', Object.keys(modules))

const raw = Object.values(modules)

// Извлекаем первый именованный экспорт из каждго модуля
export const enemies = raw
  .map(m => {
    const keys = Object.keys(m)
    return keys.length > 0 ? m[keys[0]] : null
  })
  .filter(m => m && m.name)
  .sort((a, b) => a.health - b.health)

console.log('ENEMIES loaded:', enemies)
