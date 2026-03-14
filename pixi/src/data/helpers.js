// Утилиты и хелперы для проекта

// Функция конвертации HEX строки в число Pixi
// Принимает: '#8c1300' или 0x8c1300
// Возвращает: число для Pixi
export function hexToPixi(hexString) {
  if (typeof hexString === 'number') return hexString
  if (hexString.startsWith('#')) {
    return parseInt(hexString.slice(1), 16)
  }
  return parseInt(hexString, 16)
}

// Масштабирование спрайта для покрытия области (cover)
// Используется для фоновых изображений
export function scaleToCover(sprite, targetWidth, targetHeight) {
  const scaleX = targetWidth / sprite.texture.width
  const scaleY = targetHeight / sprite.texture.height
  const scale = Math.max(scaleX, scaleY)
  sprite.scale.set(scale)
  sprite.x = (targetWidth - sprite.texture.width * scale) / 2
  sprite.y = (targetHeight - sprite.texture.height * scale) / 2
}

// Линейная интерполяция
export function lerp(current, target, factor) {
  return current + (target - current) * factor
}
