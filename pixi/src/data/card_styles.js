// Стили карт - загружаются из JSON
import cardStylesData from '../../public/assets/data/card_styles.json' with { type: 'json' }

export const cardStyles = cardStylesData.styles

// Получить стиль по ID или вернуть default
export function getCardStyle(styleId) {
  return cardStyles[styleId] || cardStyles.default
}
