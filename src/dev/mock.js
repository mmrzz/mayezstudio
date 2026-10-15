// Temporary mock content shared by every mock container: an empty box, so the
// container's own look is all there is to see. Removed when real content arrives.

// In dev, content arrives late so the waiting shimmer can be seen.
export async function load() {
  if (import.meta.env.DEV) await new Promise((r) => setTimeout(r, Math.random() * 1500))
}

export function render() {}
export default render
