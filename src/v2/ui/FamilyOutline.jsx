import { useNavigate } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { Avatar } from './Avatar'
import { lifespan } from '../lib/lifespan'
import { displayName } from '../../lib/people'
import { mediaUrl } from '../../lib/media'
import { C } from './tokens'

/**
 * A family growing left to right, with the lines drawn in CSS.
 *
 * Each generation is a column further right: a person, then their parents
 * beside them, then those parents' parents. Which is how a pedigree has been
 * drawn for a century, and it reads as one glance per generation rather than
 * as an ever-deepening indent.
 *
 * The alternative — splitting into "father's side" and "mother's side" —
 * works for exactly one generation. Above that there are four lines, then
 * eight, and nobody knows offhand which of their great-grandparents belongs to
 * which. Position does that job here without a single label.
 *
 * The lines are borders: one vertical rule down the column of parents, a short
 * horizontal one to each. No drawing surface, and it reflows like anything
 * else on the page.
 */

// A family graph can contain a cycle — somebody recorded as their own ancestor
// by a bad import — and a childrenOf that answers the same for every node
// recurses until the stack gives out. Twelve is past any record here.
const MAX_DEPTH = 12

const STEM = 14   // the rule from a person out to their parents' column

// Every pill the same width, so each generation forms a true column and the
// rules between them line up. Sized to content it looked tidy alone and ragged
// as a tree: "Patty" and "Bagdasar K. Chooljian" pushed their parents to
// different depths, and the eye lost the generations.
const PILL_W = 176

export function FamilyOutline({
  root, childrenOf, emptyLabel, canEdit, onAdd, onRemove,
}) {
  const people = childrenOf(root)
  if (!people.length) {
    return emptyLabel
      ? <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>{emptyLabel}</p>
      : null
  }

  // Every pill is the same width and every rule the same length, so a column's
  // position is arithmetic — which lets the headings sit above the generations
  // they name without measuring anything.
  const columns = depthOf(root, childrenOf)

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'flex', marginBottom: 4 }}>
        {Array.from({ length: columns }, (_, i) => (
          <span
            key={i}
            style={{
              width: PILL_W, marginRight: STEM * 2, flex: '0 0 auto',
              fontSize: 10.5, color: C.muted, letterSpacing: '.02em',
              // Only the first column starts flush; the rest are pushed right
              // by the rule that joins them to the generation before.
              marginLeft: i === 0 ? 0 : 0,
            }}
          >
            {generationName(i)}
          </span>
        ))}
      </div>

      <Generation
        people={people}
        childrenOf={childrenOf}
        canEdit={canEdit}
        onAdd={onAdd}
        onRemove={onRemove}
        depth={0}
        seen={new Set()}
      />
    </div>
  )
}

/** One column: everybody at this remove, stacked, joined by a single rule. */
function Generation({ people, childrenOf, canEdit, onAdd, onRemove, depth, seen }) {
  const shown = people.filter(p => p?.id && !seen.has(p.id))
  if (!shown.length) return null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      gap: 6,
      // The trunk. Only from the second column on — the first person has
      // nothing to their left to join.
      borderLeft: depth > 0 ? `1px solid ${C.border}` : 'none',
    }}>
      {shown.map(person => (
        <Branch
          key={person.id}
          person={person}
          childrenOf={childrenOf}
          canEdit={canEdit}
          onAdd={onAdd}
          onRemove={onRemove}
          depth={depth}
          seen={seen}
        />
      ))}
    </div>
  )
}

/** One person, with their own parents laid out to the right of them. */
function Branch({ person, childrenOf, canEdit, onAdd, onRemove, depth, seen }) {
  const forebears = depth >= MAX_DEPTH ? [] : childrenOf(person)

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {depth > 0 && <Rule />}

      <PersonPill person={person} canEdit={canEdit} onAdd={onAdd} onRemove={onRemove} />

      {forebears.length > 0 && (
        <>
          <Rule />
          <Generation
            people={forebears}
            childrenOf={childrenOf}
            canEdit={canEdit}
            onAdd={onAdd}
            onRemove={onRemove}
            depth={depth + 1}
            seen={new Set([...seen, person.id])}
          />
        </>
      )}
    </div>
  )
}

/** How many generations deep this tree actually goes. */
function depthOf(root, childrenOf, depth = 0, seen = new Set()) {
  if (depth >= MAX_DEPTH) return depth
  const people = childrenOf(root).filter(p => p?.id && !seen.has(p.id))
  if (!people.length) return depth
  return Math.max(...people.map(p =>
    depthOf(p, childrenOf, depth + 1, new Set([...seen, p.id])),
  ))
}

/**
 * What to call the people in a column.
 *
 * Written out to "3rd great-grandparents" rather than counted, because that is
 * what a family says. Past that the counting IS the readable form.
 */
function generationName(index) {
  const names = [
    'Parents', 'Grandparents', 'Great-grandparents',
    '2nd great-grandparents', '3rd great-grandparents', '4th great-grandparents',
  ]
  return names[index] || `${index + 1} generations back`
}

const Rule = () => (
  <span
    aria-hidden="true"
    style={{ width: STEM, height: 1, background: C.border, flex: '0 0 auto' }}
  />
)

/**
 * A wrapped row of people, for the relationships with no depth to show.
 *
 * A spouse, siblings and children are lists, not lineages — laying them out as
 * a tree gave each one a whole line of its own and a column of white space to
 * the right. Wrapped, a dozen grandchildren take three lines instead of twelve.
 */
export function PillRow({ people, canEdit, onAdd, onRemove }) {
  if (!people?.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {people.map(p => (
        <PersonPill
          key={p.id}
          person={p}
          canEdit={canEdit}
          onAdd={onAdd}
          onRemove={onRemove}
          fixedWidth={false}
        />
      ))}
    </div>
  )
}

function PersonPill({ person, canEdit, onAdd, onRemove, fixedWidth = true }) {
  const navigate = useNavigate()
  const detail = [person.note, lifespan(person)].filter(Boolean).join(' · ')

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, flex: '0 0 auto',
      // Uniform only inside the tree, where it makes the generations line up.
      // In a wrapped row nothing needs to align, and a fixed width leaves
      // "Amelia" sitting in an inch of nothing.
      width: fixedWidth ? PILL_W : 'auto',
      maxWidth: PILL_W,
      boxSizing: 'border-box',
      padding: '4px 8px 4px 4px', margin: '2px 0',
      borderRadius: 999,
      border: `1px solid ${person.isSelf ? C.activeText : C.border}`,
      background: person.isSelf ? C.activeBg : C.bg,
      whiteSpace: 'nowrap',
    }}>
      <button
        type="button"
        onClick={() => !person.isSelf && navigate(`/v2/people/${person.id}/ancestry`)}
        title={person.isSelf ? undefined : `Open ${displayName(person)}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: 0, background: 'none', padding: 0, font: 'inherit',
          cursor: person.isSelf ? 'default' : 'pointer', textAlign: 'left',
          flex: 1, minWidth: 0,
        }}
      >
        <Avatar name={person.name} src={person.avatar ? mediaUrl(person.avatar) : null} size={26} />
        <span style={{ minWidth: 0 }} title={displayName(person)}>
          <span style={{
            display: 'block', fontSize: 12.5,
            color: person.isSelf ? C.activeText : C.text,
            // A long name is ellipsed rather than allowed to widen the pill —
            // the full one is on the tooltip, and the shape of the tree matters
            // more here than the last few letters of a surname.
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {displayName(person)}
          </span>
          {detail && (
            <span style={{
              display: 'block', fontSize: 10.5, color: C.muted,
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {detail}
            </span>
          )}
        </span>
      </button>

      {canEdit && onAdd && (
        <button
          type="button"
          onClick={() => onAdd(person)}
          title={`Add a parent for ${displayName(person)}`}
          aria-label={`Add a parent for ${displayName(person)}`}
          style={icon}
        >
          <Plus size={12} />
        </button>
      )}
      {canEdit && onRemove && !person.isSelf && person.removableAs && (
        <button
          type="button"
          onClick={() => onRemove(person)}
          title={`Remove ${displayName(person)} from the tree`}
          aria-label={`Remove ${displayName(person)}`}
          style={icon}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

const icon = {
  display: 'grid', placeItems: 'center', width: 20, height: 20,
  border: 0, borderRadius: '50%', background: 'transparent',
  color: C.muted, cursor: 'pointer', flex: '0 0 auto',
}
