// Tiny bash-aware syntax highlighter. No dependency, no AST — just regex
// tokenisation that's "good enough" for the short snippets we render on
// admin pages (mostly mm / mpp / pip commands). If we ever need real
// language support, swap this for prism-react-renderer in one place.

const TOKEN_CLS = {
  comment:  'text-stone-500 italic',
  command:  'text-emerald-300',
  flag:     'text-amber-300',
  string:   'text-rose-300',
  path:     'text-sky-300',
  punct:    'text-white/40',
}

function tokenizeBash(line) {
  // Bail early on whole-line comments — the # has to be the first
  // non-whitespace char, which is the common shape in our snippets.
  const trimmed = line.trimStart()
  if (trimmed.startsWith('#')) {
    return [{ kind: 'comment', text: line }]
  }
  // Greedy word-by-word pass. Words are anything separated by spaces.
  const tokens = []
  const parts = line.split(/(\s+)/)
  let isFirstWord = true
  for (const part of parts) {
    if (!part) continue
    if (/^\s+$/.test(part)) {
      tokens.push({ kind: 'plain', text: part })
      continue
    }
    if (part.startsWith('#')) {
      tokens.push({ kind: 'comment', text: parts.slice(parts.indexOf(part)).join('') })
      break
    }
    if (isFirstWord) {
      tokens.push({ kind: 'command', text: part })
      isFirstWord = false
      continue
    }
    if (part.startsWith('-')) {
      tokens.push({ kind: 'flag', text: part })
      continue
    }
    if (part.startsWith('"') || part.startsWith("'")) {
      tokens.push({ kind: 'string', text: part })
      continue
    }
    if (part.includes('/') || part.startsWith('~') || part.startsWith('.')) {
      tokens.push({ kind: 'path', text: part })
      continue
    }
    tokens.push({ kind: 'plain', text: part })
  }
  return tokens
}

export function CodeBlock({ code, language = 'bash' }) {
  const lines = code.split('\n')
  return (
    <pre className="overflow-x-auto rounded bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-stone-200">
      <code>
        {lines.map((line, i) => {
          const tokens = language === 'bash' ? tokenizeBash(line) : [{ kind: 'plain', text: line }]
          return (
            <div key={i}>
              {tokens.map((t, j) => (
                <span key={j} className={TOKEN_CLS[t.kind] || ''}>{t.text}</span>
              ))}
              {tokens.length === 0 && <span>&nbsp;</span>}
            </div>
          )
        })}
      </code>
    </pre>
  )
}
