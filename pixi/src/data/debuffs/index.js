// Автоимпорт дебаффов
const modules = import.meta.glob('./*.js', { eager: true })

export const debuffs = {}

for (const path in modules) {
  const mod = modules[path]
  if (mod.apply) {
    const name = path.replace('./', '').replace('.js', '')
    debuffs[name] = mod.apply
  }
}

export function applyDebuff(type, cards, params) {
  const debuff = debuffs[type]
  if (debuff) {
    debuff(cards, params)
  }
}
