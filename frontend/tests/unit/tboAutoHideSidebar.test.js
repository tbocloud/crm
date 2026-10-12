import { createApp, h, nextTick, reactive, ref } from 'vue'
import {
  CLOSE_DELAY_MS,
  HOVER_INTENT_MS,
  pinStorageKey,
  useAutoHideSidebar,
} from '@/tbo/sidebar/useAutoHideSidebar'

const route = reactive({ fullPath: '/leads' })
vi.mock('vue-router', () => ({ useRoute: () => route }))

const mouse = { pointerType: 'mouse' }
const touch = { pointerType: 'touch' }

function mountSidebar({ mobile = false, held = ref(false) } = {}) {
  let state
  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp({
    setup() {
      state = useAutoHideSidebar({ mobile, held, user: 'a@tbo.test' })
      return () => h('div', { ref: state.shell }, [h('button')])
    },
  })
  app.mount(el)
  return {
    state,
    on: state.shellListeners,
    unmount: () => {
      app.unmount()
      el.remove()
    },
  }
}

describe('useAutoHideSidebar', () => {
  let view

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    view?.unmount()
    vi.useRealTimers()
  })

  it('rests collapsed and unpinned by default', () => {
    view = mountSidebar()
    expect(view.state.isPinned.value).toBe(false)
    expect(view.state.autoHide.value).toBe(true)
    expect(view.state.isCollapsed.value).toBe(true)
  })

  it('opens after the hover delay and closes after the close delay', () => {
    view = mountSidebar()
    view.on.onPointerenter(mouse)
    vi.advanceTimersByTime(HOVER_INTENT_MS - 1)
    expect(view.state.isCollapsed.value).toBe(true)
    vi.advanceTimersByTime(1)
    expect(view.state.isCollapsed.value).toBe(false)

    view.on.onPointerleave(mouse)
    vi.advanceTimersByTime(CLOSE_DELAY_MS - 1)
    expect(view.state.isCollapsed.value).toBe(false)
    vi.advanceTimersByTime(1)
    expect(view.state.isCollapsed.value).toBe(true)
  })

  it('ignores a pointer passing across', () => {
    view = mountSidebar()
    view.on.onPointerenter(mouse)
    vi.advanceTimersByTime(HOVER_INTENT_MS / 2)
    view.on.onPointerleave(mouse)
    vi.advanceTimersByTime(CLOSE_DELAY_MS)
    expect(view.state.isCollapsed.value).toBe(true)
  })

  it('swallows the first tap and lets the next one through', () => {
    view = mountSidebar()
    const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() }
    view.on.onPointerdownCapture(touch)
    view.on.onClickCapture(click)
    expect(view.state.isCollapsed.value).toBe(false)
    expect(click.preventDefault).toHaveBeenCalled()

    const second = { preventDefault: vi.fn(), stopPropagation: vi.fn() }
    view.on.onPointerdownCapture(touch)
    view.on.onClickCapture(second)
    expect(second.preventDefault).not.toHaveBeenCalled()
  })

  it('opens on keyboard focus only and closes on Escape', () => {
    view = mountSidebar()
    view.on.onFocusin({ target: { matches: () => false } })
    expect(view.state.isCollapsed.value).toBe(true)

    view.on.onFocusin({ target: { matches: () => true }, relatedTarget: null })
    expect(view.state.isCollapsed.value).toBe(false)

    view.on.onKeydown({ key: 'Escape' })
    expect(view.state.isCollapsed.value).toBe(true)
  })

  it('stays open while something it opened is held, then closes', async () => {
    const held = ref(false)
    view = mountSidebar({ held })
    view.on.onPointerenter(mouse)
    vi.advanceTimersByTime(HOVER_INTENT_MS)
    held.value = true
    await nextTick()
    view.on.onPointerleave(mouse)
    vi.advanceTimersByTime(CLOSE_DELAY_MS)
    expect(view.state.isCollapsed.value).toBe(false)

    held.value = false
    await nextTick()
    vi.advanceTimersByTime(CLOSE_DELAY_MS)
    expect(view.state.isCollapsed.value).toBe(true)
  })

  it('folds away after a tap navigates', async () => {
    view = mountSidebar()
    view.on.onPointerdownCapture(touch)
    expect(view.state.isCollapsed.value).toBe(false)
    route.fullPath = '/deals'
    await nextTick()
    expect(view.state.isCollapsed.value).toBe(true)
  })

  it('pins open per user, and stays open when unpinned under the pointer', async () => {
    view = mountSidebar()
    view.state.togglePinned()
    await nextTick()
    expect(view.state.isCollapsed.value).toBe(false)
    expect(view.state.autoHide.value).toBe(false)
    expect(localStorage.getItem(pinStorageKey('a@tbo.test'))).toBe('true')
    expect(view.state.notificationsStyle.value).toBeUndefined()

    view.on.onPointerenter(mouse)
    view.state.togglePinned()
    expect(view.state.isCollapsed.value).toBe(false)
    view.on.onPointerleave(mouse)
    vi.advanceTimersByTime(CLOSE_DELAY_MS)
    expect(view.state.isCollapsed.value).toBe(true)
  })

  it('never collapses the mobile drawer', () => {
    view = mountSidebar({ mobile: true })
    expect(view.state.isCollapsed.value).toBe(false)
    view.on.onPointerdownCapture(touch)
    const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() }
    view.on.onClickCapture(click)
    expect(click.preventDefault).not.toHaveBeenCalled()
  })
})
