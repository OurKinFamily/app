export const displayName = p => p.known_as || p.name

export const otherName = p => (p.known_as && p.known_as !== p.name ? p.name : null)
