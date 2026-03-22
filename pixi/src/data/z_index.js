// Система слоёв для игры
// ============================================================================
// ВАЖНО: Для работы zIndex у контейнера должно быть sortableChildren = true
// Пример: container.sortableChildren = true
// ============================================================================
// zIndex: 0-99 - фоны (старт, база, карта, бой...)
// zIndex: 100-999 - резерв под динамику фона
// zIndex: 1000-9999 - игровые объекты
// zIndex: 10000-99999 - UI (кнопки, сообщения, диалоги)
// ============================================================================

// Текущие счётчики
let bgCounter = 0
let gameObjectCounter = 1000
let uiCounter = 10000

export const LAYERS = {
 // Фоны
 BG_START: 0,
 BG_BASE: 1,
 BG_MAP: 2,
 BG_BATTLE: 3,
  
 // Игровые объекты
 GAME_OBJECTS: 1000,
  
 // UI
 UI: 10000,
 UI_OVERLAY: 11000,
  
 // Debug
 DEBUG: 999999,
  
 // Геттеры для автоматической выдачи
 getBg: () => bgCounter++,
 getGameObject: () => gameObjectCounter++,
 getUi: () => uiCounter++,
  
 // Сброс счётчиков (при переходе между экранами)
 reset: () => {
   bgCounter = 0
   gameObjectCounter = 1000
   uiCounter = 10000
 },
 
 // Сброс только фонов (при смене экрана)
 resetBg: () => {
   bgCounter = 0
 }
}

// Алиас для совместимости
export const Z = LAYERS
