// Temporary mock content shared by every mock container. Removed with the --mock-N
// tokens when real content arrives.

// In dev, content arrives late so the waiting shimmer can be seen.
export async function load() {
  if (import.meta.env.DEV) await new Promise((r) => setTimeout(r, Math.random() * 1500))
}

export function render(box, { props }) {
  const fill = document.createElement('div')
  fill.style.cssText = `width:100%;height:100%;background:var(--mock-${props.tone})`
  box.append(fill)
}

// The portrait swap: same tone with diagonal stripes, so the swap is visible.
export function renderSmall(box, { props }) {
  const tone = `var(--mock-${props.tone})`
  const fill = document.createElement('div')
  fill.style.cssText = `width:100%;height:100%;background:repeating-linear-gradient(45deg,${tone} 0 8px,color-mix(in srgb,${tone} 70%,var(--bg)) 8px 16px)`
  box.append(fill)
}
export default render
