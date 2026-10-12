// TBO: the desktop sidebar auto-hides to the icon rail, like the TBO Support
// hub (tbocloud/helpdesk AppSidebar.vue). See docs/tbo-sidebar.md.
import { computed, onBeforeUnmount, ref, toValue, watch } from 'vue'
import { onClickOutside, useMutationObserver, useStorage } from '@vueuse/core'
import { useRoute } from 'vue-router'

export const HOVER_INTENT_MS = 120
export const CLOSE_DELAY_MS = 250
// frappe-ui Sidebar's default width; the notifications panel opens beside it
const EXPANDED_WIDTH = '15rem'

export function pinStorageKey(user) {
  return `tbo_sidebar_pinned:${user || 'guest'}`
}

/**
 * Auto-hide state for AppSidebar. Bind `shellListeners` and `shell` on the
 * element that wraps the Sidebar and anything it opens in place.
 *
 * @param {object} options
 * @param {import('vue').MaybeRefOrGetter<boolean>} options.mobile the drawer, which never auto-hides
 * @param {import('vue').MaybeRefOrGetter<boolean>} [options.held] something outside the shell it opened is still open (the notifications panel)
 * @param {string} [options.user] the pin is stored per user
 */
export function useAutoHideSidebar({ mobile, held = false, user }) {
  const shell = ref(null)
  // Default off, so everyone starts on auto-hide. useStorage falls back to
  // memory when storage is blocked or full.
  const isPinned = useStorage(pinStorageKey(user), false)
  const isPeeking = ref(false)

  const autoHide = computed(() => !toValue(mobile) && !isPinned.value)
  const isCollapsed = computed(() => autoHide.value && !isPeeking.value)

  let pointerInside = false
  const keyboardInside = ref(false)
  // a dropdown it owns (the brand menu) is open
  const popupOpen = ref(false)
  const holdOpen = computed(
    () => keyboardInside.value || popupOpen.value || Boolean(toValue(held)),
  )
  let timer
  let swallowClick = false
  // where keyboard focus came from, so Escape can hand it back
  let returnFocus = null

  function setPeeking(value) {
    clearTimeout(timer)
    isPeeking.value = value
  }

  function schedule(value, delay) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (value || (!pointerInside && !holdOpen.value)) setPeeking(value)
    }, delay)
  }

  // Touch is handled by tap (onPointerdownCapture), so hover ignores it.
  function onPointerenter(e) {
    if (e.pointerType === 'touch') return
    pointerInside = true
    if (autoHide.value) schedule(true, HOVER_INTENT_MS)
  }

  function onPointerleave(e) {
    if (e.pointerType === 'touch') return
    pointerInside = false
    if (autoHide.value) schedule(false, CLOSE_DELAY_MS)
  }

  // The first tap on the rail only expands it; the next tap picks an item.
  // Any pointer press also means the keyboard no longer holds it open.
  function onPointerdownCapture(e) {
    keyboardInside.value = false
    swallowClick =
      autoHide.value && e.pointerType === 'touch' && !isPeeking.value
    if (swallowClick) setPeeking(true)
  }

  function onClickCapture(e) {
    if (!swallowClick) return
    swallowClick = false
    e.preventDefault()
    e.stopPropagation()
  }

  // Only keyboard focus expands it: a mouse click leaves focus on the item,
  // and that must not hold the sidebar open after the pointer has gone.
  function onFocusin(e) {
    if (!e.target?.matches?.(':focus-visible')) {
      keyboardInside.value = false
      return
    }
    const from = e.relatedTarget
    if (!keyboardInside.value) {
      returnFocus =
        from instanceof HTMLElement && !shell.value?.contains(from)
          ? from
          : null
    }
    keyboardInside.value = true
    if (autoHide.value) setPeeking(true)
  }

  function onFocusout(e) {
    const next = e.relatedTarget
    if (next instanceof Node && shell.value?.contains(next)) return
    keyboardInside.value = false
  }

  function onKeydown(e) {
    if (e.key !== 'Escape' || !autoHide.value || !isPeeking.value) return
    keyboardInside.value = false
    setPeeking(false)
    const target = returnFocus?.isConnected
      ? returnFocus
      : document.querySelector('main')
    returnFocus = null
    target?.focus()
  }

  function togglePinned() {
    isPinned.value = !isPinned.value
    // unpinned under the pointer or keyboard, it stays open until they leave
    setPeeking(!isPinned.value && (pointerInside || keyboardInside.value))
  }

  onClickOutside(shell, () => {
    if (autoHide.value && isPeeking.value && !holdOpen.value) setPeeking(false)
  })

  useMutationObserver(
    shell,
    () => {
      popupOpen.value = Boolean(
        shell.value?.querySelector('[aria-haspopup][aria-expanded="true"]'),
      )
    },
    { subtree: true, attributes: true, attributeFilter: ['aria-expanded'] },
  )

  watch(holdOpen, (isHeld) => {
    if (!isHeld && autoHide.value && !pointerInside) {
      schedule(false, CLOSE_DELAY_MS)
    }
  })

  // a tap on an item navigated; fold the expanded rail away again, unless
  // something it opened (the notifications panel) still holds it
  const route = useRoute()
  watch(
    () => route?.fullPath,
    () => {
      if (autoHide.value && !pointerInside && !holdOpen.value) {
        setPeeking(false)
      }
    },
  )

  onBeforeUnmount(() => clearTimeout(timer))

  // While it auto-hides, the rail keeps its place and the sidebar opens over
  // the page; the notifications panel then anchors to the expanded width.
  const notificationsStyle = computed(() =>
    autoHide.value ? { left: `calc(${EXPANDED_WIDTH} + 1px)` } : undefined,
  )

  return {
    shell,
    isPinned,
    isPeeking,
    isCollapsed,
    autoHide,
    togglePinned,
    notificationsStyle,
    shellListeners: {
      onPointerenter,
      onPointerleave,
      onPointerdownCapture,
      onClickCapture,
      onFocusin,
      onFocusout,
      onKeydown,
    },
  }
}
