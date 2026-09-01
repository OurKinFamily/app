/**
 * v2 Photos — placeholder content so the layout can be judged with something
 * in it. Real gallery comes next.
 */
export function V2HomePage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 400, margin: '16px 0 24px' }}>
        Photos
      </h1>

      {/* Stand-in tiles: just enough to see how the content area breathes
          against the header and rail. */}
      <div style={{ fontSize: 13, color: '#5f6368', marginBottom: 12 }}>
        Today
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 4,
        }}
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1 / 1',
              background: '#f1f3f4',
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    </div>
  )
}
