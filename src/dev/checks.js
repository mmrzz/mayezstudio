// Dev-only layout warnings (plan §1). Pure functions, so they are easy to test.

const overlaps = (a, b) =>
  a.col < b.col + b.cols && b.col < a.col + a.cols && a.row < b.row + b.rows && b.row < a.row + a.rows

// Returns a list of warning strings for one section on one profile.
export function checkItems(def, profile) {
  const out = []
  const placed = []
  for (const item of def.items) {
    const place = item[profile.name]
    const name = `${def.id}/${item.container}`
    if (place === undefined) {
      out.push(`${name}: no ${profile.name} layout (use null to hide on purpose)`)
      continue
    }
    if (place === null) continue
    const { col, row, cols, rows } = place
    if (col < 1 || row < 1 || col + cols - 1 > profile.cols || row + rows - 1 > profile.rows) {
      out.push(`${name}: outside the ${profile.cols}x${profile.rows} ${profile.name} design grid`)
    }
    for (const other of placed) {
      if (overlaps(place, other.place)) out.push(`${name} overlaps ${def.id}/${other.id}`)
    }
    placed.push({ id: item.container, place })
  }
  return out
}

export function warn(messages) {
  for (const m of messages) console.warn(`[layout] ${m}`)
}

export function checkOverflow(name, box) {
  if (box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1) {
    console.warn(`[layout] ${name}: content overflows its box`)
  }
}
