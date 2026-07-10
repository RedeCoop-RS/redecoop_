export const FLOATING_MENU_WIDTH = 196
export const FLOATING_MENU_GAP = 6
export const FLOATING_MENU_VIEWPORT_PADDING = 8
export const FLOATING_MENU_ITEM_HEIGHT = 38

export function estimateFloatingMenuHeight(itemCount: number) {
  return Math.max(itemCount, 1) * FLOATING_MENU_ITEM_HEIGHT + 12
}

export function computeFloatingMenuPosition(
  triggerRect: DOMRect,
  menuWidth: number,
  menuHeight: number,
) {
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight
  const pad = FLOATING_MENU_VIEWPORT_PADDING

  let top = triggerRect.bottom + FLOATING_MENU_GAP
  if (top + menuHeight > viewportH - pad) {
    top = triggerRect.top - menuHeight - FLOATING_MENU_GAP
  }
  top = Math.max(pad, Math.min(top, viewportH - menuHeight - pad))

  let left = triggerRect.right - menuWidth
  left = Math.max(pad, Math.min(left, viewportW - menuWidth - pad))

  return { top, left }
}
