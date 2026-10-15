// The test route, `/test/<container id>`: one container as large as the screen allows,
// in its shape on the page, for checking a design. It gets the same context as on the page (profile, grid
// size in cells, props) from its placement in a section, so what you see is what
// the page renders, only larger. `?profile=portrait|tablet|landscape` forces a
// profile; without it the screen's own is used.
//
// A controls bar sits above the box: replay, jump to the end, a scrubber, speed, the
// light/dark theme and the profile. `?bare` leaves it out, for the container alone.
//
// Animated containers get a `reveal` event as soon as they are rendered, so they
// play on load. `r` replays (cleans up and renders again), `?speed=0.25` slows
// every timeline, `?end` reveals instantly and shows the finished state, `?at=2.5` holds
// every timeline on that second.

import './test.css'
import { PROFILES, BOX, RESIZE_DEBOUNCE } from '../config.js'
import { pickProfile, measureScreen, computeGeometry } from '../core/layout.js'
import { loadContainer, renderFor, containerIds, applyLook } from '../content/containers.js'
import { toggleTheme } from '../ui/theme.js'
import sections from '../content/sections.js'

const PROFILE_LABELS = { portrait: 'موبایل', tablet: 'تبلت', landscape: 'دسکتاپ' }
const SPEEDS = [[1, '۱×'], [0.5, '۰٫۵×'], [0.25, '۰٫۲۵×']]
const fa = (n, d = 0) => n.toFixed(d).replace(/\d/g, (x) => '۰۱۲۳۴۵۶۷۸۹'[x]).replace('.', '٫')

export async function mountTest(id) {
  document.querySelector('.chrome')?.remove()
  document.querySelector('.page')?.remove()
  document.querySelector('.scroll-hint')?.remove()
  document.title = `test · ${id}`

  const root = document.createElement('main')
  root.className = 'box test-box' // the page's box styles, so containers see the same container context
  root.dataset.state = 'ready'
  document.body.append(root)

  const params = new URLSearchParams(location.search)
  const asked = params.get('profile')
  const instant = params.has('end')
  const profile = PROFILES.find((p) => p.name === asked) ?? pickProfile()
  const { dev } = await import('../core/timeline.js')

  // ---------- Controls bar ----------
  let replay = () => {}
  let finish = () => {}
  let bar = null
  const info = document.createElement('span')
  const scrub = document.createElement('input')
  const time = document.createElement('span')
  if (!params.has('bare')) {
    bar = document.createElement('div')
    bar.className = 'tbar'
    const button = (label, onclick) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = label
      b.onclick = onclick
      return b
    }
    scrub.type = 'range'
    scrub.min = 0
    scrub.step = 0.01
    scrub.disabled = true
    scrub.setAttribute('aria-label', 'زمان')
    time.className = 'tbar-time'
    info.className = 'tbar-info'
    const speed = document.createElement('select')
    speed.setAttribute('aria-label', 'سرعت')
    for (const [v, label] of SPEEDS) speed.append(new Option(label, v))
    speed.value = dev.speed
    speed.onchange = () => {
      dev.speed = Number(speed.value)
      dev.hold = null
      replay()
    }
    const profiles = document.createElement('span')
    profiles.className = 'tbar-group'
    for (const { name } of [...PROFILES].reverse()) {
      const b = button(PROFILE_LABELS[name] ?? name, () => {
        const url = new URL(location.href)
        url.searchParams.set('profile', name)
        location.href = url
      })
      b.setAttribute('aria-pressed', String(name === profile.name))
      profiles.append(b)
    }
    bar.append(
      button('پخش دوباره', () => {
        dev.hold = null
        replay()
      }),
      button('پایان', () => {
        dev.hold = null
        finish()
      }),
      scrub,
      time,
      speed,
      button('روشن / تیره', (e) => toggleTheme(e.clientX, e.clientY)),
      profiles,
      info,
    )
    document.body.append(bar)

    // The scrubber follows the running timeline; dragging it holds every timeline on that second.
    let scheduled = false
    scrub.oninput = () => {
      dev.hold = Number(scrub.value)
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        replay()
      })
    }
    const follow = () => {
      const cur = dev.current
      scrub.disabled = !cur
      if (cur) {
        scrub.max = cur.length
        if (document.activeElement !== scrub) scrub.value = cur.t
        time.textContent = `${fa(cur.t, 1)} / ${fa(cur.length, 1)} ث`
      } else {
        time.textContent = ''
        scrub.value = 0
      }
      requestAnimationFrame(follow)
    }
    follow()
  }
  const barHeight = () => bar?.offsetHeight ?? 0

  try {
    const def = await loadContainer(id)
    applyLook(root, def)
    const item = sections.flatMap((s) => s.items).find((i) => i.container === id)
    const place = item?.[profile.name]
    // Not placed (or hidden on this profile): fall back to the design grid's size.
    const size = place ?? { cols: profile.cols, rows: profile.rows }

    // The box at its size on the page for this screen (as section.js sizes it), zoomed as large
    // as the window allows below the bar, centred, with the page's margin. Zoom scales everything
    // inside alike, text included, and the container still measures itself in page pixels.
    const fit = () => {
      const screen = measureScreen()
      const geo = computeGeometry(profile, screen)
      const width = size.cols * geo.cellW - 1 - 2 * BOX.gap
      const height = size.rows * geo.cellH - 1 - 2 * BOX.gap
      const top = barHeight()
      const vh = document.documentElement.clientHeight - top
      const zoom = Math.min((screen.width - 2 * BOX.gap) / width, (vh - 2 * BOX.gap) / height)
      // left and top are zoomed too
      Object.assign(root.style, {
        inset: 'auto',
        zoom,
        left: `${(screen.width - width * zoom) / 2 / zoom}px`,
        top: `${(top + (vh - height * zoom) / 2) / zoom}px`,
        width: `${width}px`,
        height: `${height}px`,
      })
      info.textContent = `${id} · ${profile.name} · ${size.cols}×${size.rows} · ${Math.round(width)}×${Math.round(height)}px · ×${zoom.toFixed(2)}`
    }
    fit()
    const ctx = { profile: profile.name, cols: size.cols, rows: size.rows, props: { ...def.props, ...item?.props, ...place?.props } }
    await def.load?.(ctx)
    await document.fonts.load('1em Vazirmatn') // animations measure text

    let cleanup
    const play = (finished = instant) => {
      cleanup?.()
      root.replaceChildren()
      root.classList.toggle('instant', finished)
      const result = renderFor(def, profile.name)(root, ctx)
      cleanup = typeof result === 'function' ? result : undefined
      dev.current = null
      root.dispatchEvent(new CustomEvent('reveal', { detail: { instant: finished } }))
    }
    replay = () => play()
    finish = () => play(true)
    play()
    addEventListener('keydown', (e) => {
      if (e.key !== 'r' || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, select')) return
      dev.hold = null
      play()
    })
    // A resize rebuilds the box finished, as the page does.
    let resizing
    addEventListener('resize', () => {
      clearTimeout(resizing)
      resizing = setTimeout(() => {
        fit()
        play(true)
      }, RESIZE_DEBOUNCE)
    })
  } catch (err) {
    console.error('[test]', err)
    root.textContent = `${err.message}\nContainers: ${containerIds().join(', ')}`
  }
}
