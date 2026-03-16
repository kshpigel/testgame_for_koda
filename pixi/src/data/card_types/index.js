// Автоимпорт всех типов карт
const modules = import.meta.glob('./*.js', { eager: true })
console.log('CARD modules raw:', modules)

const raw = Object.values(modules)

// Извлекаем первый именованный экспорт из каждго модуля
export const card_types = raw
  .map(m => {
    const keys = Object.keys(m)
    return keys.length > 0 ? m[keys[0]] : null
  })
  .filter(m => m && m.type)
  .sort((a, b) => a.type - b.type)
