import { Link } from 'react-router-dom'
import { Notebook } from 'lucide-react'
import { C } from '../ui/tokens'

/**
 * The scrapbook, across everybody — which does not exist yet.
 *
 * Scrapbooks are real and full: journals, letters, school papers, the pages of
 * Margaret's stories. But they hang off a person, and the API can only be
 * asked for one person's collections at a time. An archive-wide view needs an
 * endpoint that lists them all, and until that exists this page would either
 * lie or ask for a hundred people's collections one at a time.
 *
 * So it says where they are instead. Better than a dead link in the sidebar,
 * and better than a grid that quietly shows a third of what is there.
 */
export function V2ScrapbookPage() {
  return (
    <div style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
      <span style={{
        display: 'grid', placeItems: 'center', width: 48, height: 48,
        margin: '0 auto 14px', borderRadius: '50%',
        background: C.surface, color: C.muted,
      }}>
        <Notebook size={22} />
      </span>

      <h1 style={{ fontSize: 20, fontWeight: 400, margin: '0 0 8px' }}>Scrapbooks</h1>

      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 18px', lineHeight: 1.6 }}>
        Journals, letters, school papers and everything else that was scanned rather than
        photographed. They live with the person they belong to — open somebody and their
        scrapbook is one of their tabs.
      </p>

      <Link
        to="/v2/people"
        style={{
          display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 18px',
          borderRadius: 17, fontSize: 13, textDecoration: 'none',
          background: C.activeText, color: '#fff',
        }}
      >
        Find somebody
      </Link>
    </div>
  )
}
