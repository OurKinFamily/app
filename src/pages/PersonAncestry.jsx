import { useMemo, useCallback, useEffect, useState, startTransition } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ReactFlow, Handle, Position, Background } from '@xyflow/react'
import { Plus } from 'lucide-react'
import '@xyflow/react/dist/base.css'
import { getRelatives } from '../lib/api'
import { AddRelativeModal } from '../components/AddRelativeModal'

const NODE_W = 128
const NODE_H = 96
const SMALL_W = 96
const SMALL_H = 64
const H_GAP = 20
const PARENT_GAP = H_GAP
const UNIT_GAP = 44
const V_GAP = 60
const ACT = 28  // action node size

function buildGraph(person, relatives, childRelatives) {
  const { parents, spouses, children, siblings } = relatives
  const nodes = []
  const edges = []

  const Y_PARENTS = 0
  const Y_SELF = NODE_H + V_GAP
  const Y_CHILDREN = Y_SELF + NODE_H + V_GAP
  const Y_GRANDCHILDREN = Y_CHILDREN + NODE_H + V_GAP

  // Parents — centered over self (x=0)
  if (parents[0]) {
    nodes.push({
      id: `p-${parents[0].id}`, type: 'person',
      position: { x: -(NODE_W + PARENT_GAP / 2), y: Y_PARENTS },
      data: { ...parents[0], personId: parents[0].id, relationship: 'Parent' },
    })
    edges.push({
      id: 'e-p0', source: `p-${parents[0].id}`, target: 'self',
      sourceHandle: 'bottom', targetHandle: 'top', type: 'smoothstep',
      style: { stroke: 'rgba(255,255,255,0.2)', strokeDasharray: '4 3' },
    })
  }
  if (parents[1]) {
    nodes.push({
      id: `p-${parents[1].id}`, type: 'person',
      position: { x: PARENT_GAP / 2, y: Y_PARENTS },
      data: { ...parents[1], personId: parents[1].id, relationship: 'Parent' },
    })
    edges.push({
      id: 'e-p1', source: `p-${parents[1].id}`, target: 'self',
      sourceHandle: 'bottom', targetHandle: 'top', type: 'smoothstep',
      style: { stroke: 'rgba(255,255,255,0.2)', strokeDasharray: '4 3' },
    })
  }

  // Self
  nodes.push({
    id: 'self', type: 'person',
    position: { x: -NODE_W / 2, y: Y_SELF },
    data: { ...person, personId: person.id, isSelf: true },
  })

  // Siblings — chained
  const rightmostSibX = -(NODE_W / 2) - H_GAP - SMALL_W
  siblings.forEach((s, i) => {
    const x = rightmostSibX - (siblings.length - 1 - i) * (SMALL_W + H_GAP)
    nodes.push({
      id: `sib-${s.id}`, type: 'person',
      position: { x, y: Y_SELF + (NODE_H - SMALL_H) / 2 },
      data: { ...s, personId: s.id, relationship: 'Sibling', small: true },
    })
    const target = i === siblings.length - 1 ? 'self' : `sib-${siblings[i + 1].id}`
    edges.push({
      id: `e-sib-${s.id}`, source: `sib-${s.id}`, target,
      sourceHandle: 'right', targetHandle: 'left', type: 'straight',
      style: { stroke: 'rgba(255,255,255,0.15)', strokeDasharray: '4 3' },
    })
  })

  // Add-sibling button to the left of the sibling group (or left of self)
  const leftmostSibX = siblings.length > 0
    ? rightmostSibX - (siblings.length - 1) * (SMALL_W + H_GAP)
    : -(NODE_W / 2)
  nodes.push({
    id: 'action-sibling-left', type: 'action',
    position: { x: leftmostSibX - H_GAP - ACT, y: Y_SELF + (NODE_H - ACT) / 2 },
    data: { actionType: 'sibling', label: 'Add sibling' },
  })

  const isMultiSpouse = spouses.length > 1

  if (isMultiSpouse) {
    // === MULTI-SPOUSE: spouses side-by-side below self, like children layout ===
    const Y_SPOUSES = Y_SELF + NODE_H + V_GAP
    const Y_CHILDREN_MULTI = Y_SPOUSES + NODE_H + V_GAP

    const totalSpouseW = spouses.length * NODE_W + (spouses.length - 1) * H_GAP
    const spouseStartX = -totalSpouseW / 2

    spouses.forEach((s, i) => {
      nodes.push({
        id: `sp-${s.id}`, type: 'person',
        position: { x: spouseStartX + i * (NODE_W + H_GAP), y: Y_SPOUSES },
        data: { ...s, personId: s.id, relationship: 'Spouse' },
      })
      edges.push({
        id: `e-sp-${s.id}`, source: 'self', target: `sp-${s.id}`,
        sourceHandle: 'bottom', targetHandle: 'top', type: 'step',
        style: { stroke: 'rgba(251,113,133,0.5)', strokeWidth: 1.5 },
      })
    })

    // Add-spouse button to the right of the last spouse
    nodes.push({
      id: 'action-spouse', type: 'action',
      position: {
        x: spouseStartX + spouses.length * (NODE_W + H_GAP),
        y: Y_SPOUSES + (NODE_H - ACT) / 2,
      },
      data: { actionType: 'spouse', label: 'Add spouse' },
    })

    if (children.length === 0) {
      nodes.push({
        id: 'action-child', type: 'action',
        position: { x: -ACT / 2, y: Y_CHILDREN_MULTI - V_GAP / 2 },
        data: { actionType: 'child', label: 'Add child' },
      })
      return { nodes, edges }
    }

    // Group children by which spouse is also their parent
    const spouseIdSet = new Set(spouses.map(s => s.id))
    const spouseIdxMap = Object.fromEntries(spouses.map((s, i) => [s.id, i]))
    const childrenBySpouseIdx = {}
    const childrenNoCoparent = []
    children.forEach(child => {
      const pars = childRelatives[child.id]?.parents || []
      const copar = pars.find(p => spouseIdSet.has(p.id))
      if (copar) {
        const idx = spouseIdxMap[copar.id]
        ;(childrenBySpouseIdx[idx] = childrenBySpouseIdx[idx] || []).push(child)
      } else {
        childrenNoCoparent.push(child)
      }
    })

    // Place each group centered below their spouse
    spouses.forEach((s, spouseIdx) => {
      const group = childrenBySpouseIdx[spouseIdx] || []
      if (group.length === 0) return
      const spouseCX = spouseStartX + spouseIdx * (NODE_W + H_GAP) + NODE_W / 2
      const totalW = group.length * NODE_W + (group.length - 1) * H_GAP
      const startX = spouseCX - totalW / 2
      group.forEach((child, j) => {
        nodes.push({
          id: `ch-${child.id}`, type: 'person',
          position: { x: startX + j * (NODE_W + H_GAP), y: Y_CHILDREN_MULTI },
          data: { ...child, personId: child.id, relationship: 'Child' },
        })
        edges.push({
          id: `e-ch-${child.id}`, source: `sp-${s.id}`, target: `ch-${child.id}`,
          sourceHandle: 'bottom', targetHandle: 'top', type: 'step',
          style: { stroke: 'rgba(255,255,255,0.15)', strokeDasharray: '4 3' },
        })
      })
    })

    // Children with no co-parent match drop below self
    if (childrenNoCoparent.length > 0) {
      const totalW = childrenNoCoparent.length * NODE_W + (childrenNoCoparent.length - 1) * H_GAP
      const startX = -totalW / 2
      childrenNoCoparent.forEach((child, j) => {
        nodes.push({
          id: `ch-${child.id}`, type: 'person',
          position: { x: startX + j * (NODE_W + H_GAP), y: Y_CHILDREN_MULTI },
          data: { ...child, personId: child.id, relationship: 'Child' },
        })
        edges.push({
          id: `e-ch-${child.id}`, source: 'self', target: `ch-${child.id}`,
          sourceHandle: 'bottom', targetHandle: 'top', type: 'step',
          style: { stroke: 'rgba(255,255,255,0.15)', strokeDasharray: '4 3' },
        })
      })
    }

    return { nodes, edges }
  }

  // === SINGLE-SPOUSE (OR NO SPOUSE) LAYOUT ===
  spouses.forEach((s, i) => {
    nodes.push({
      id: `sp-${s.id}`, type: 'person',
      position: { x: NODE_W / 2 + H_GAP + i * (NODE_W + H_GAP), y: Y_SELF },
      data: { ...s, personId: s.id, relationship: 'Spouse' },
    })
    edges.push({
      id: `e-sp-${s.id}`, source: 'self', target: `sp-${s.id}`,
      sourceHandle: 'right', targetHandle: 'left', type: 'straight',
      style: { stroke: 'rgba(251,113,133,0.5)', strokeWidth: 1.5 },
    })
  })

  // Add-spouse button to the right of the last spouse (or right of self)
  const spouseRightX = spouses.length > 0
    ? NODE_W / 2 + H_GAP + spouses.length * (NODE_W + H_GAP)
    : NODE_W / 2 + H_GAP
  nodes.push({
    id: 'action-spouse', type: 'action',
    position: { x: spouseRightX, y: Y_SELF + (NODE_H - ACT) / 2 },
    data: { actionType: 'spouse', label: 'Add spouse' },
  })

  if (children.length === 0) {
    // Add-child button below couple when no children yet
    const spCX = spouses.length > 0 ? NODE_W / 2 + H_GAP + NODE_W / 2 : 0
    const midX = spCX / 2
    nodes.push({
      id: 'action-child', type: 'action',
      position: { x: midX - ACT / 2, y: Y_CHILDREN - V_GAP / 2 },
      data: { actionType: 'child', label: 'Add child' },
    })
    return { nodes, edges }
  }

  // Children row — each child as a unit (child + their spouse + grandchildren)
  const childUnits = children.map(child => {
    const cr = childRelatives[child.id]
    const childSpouses = cr?.spouses || []
    const grandchildren = cr?.children || []
    const coupleWidth = NODE_W + childSpouses.length * (H_GAP + NODE_W)
    const gcWidth = grandchildren.length > 0
      ? grandchildren.length * NODE_W + (grandchildren.length - 1) * H_GAP
      : 0
    return { child, childSpouses, grandchildren, coupleWidth, unitWidth: Math.max(coupleWidth, gcWidth) }
  })

  const totalWidth = childUnits.reduce((s, u) => s + u.unitWidth, 0)
    + Math.max(0, children.length - 1) * UNIT_GAP

  const spCenterX = spouses.length > 0 ? NODE_W / 2 + H_GAP + NODE_W / 2 : 0
  const coupleMidX = spCenterX / 2
  let cursorX = coupleMidX - totalWidth / 2

  childUnits.forEach(({ child, childSpouses, grandchildren, coupleWidth, unitWidth }) => {
    const unitCenterX = cursorX + unitWidth / 2
    const childNodeX = unitCenterX - coupleWidth / 2

    nodes.push({
      id: `ch-${child.id}`, type: 'person',
      position: { x: childNodeX, y: Y_CHILDREN },
      data: { ...child, personId: child.id, relationship: 'Child' },
    })
    edges.push({
      id: `e-ch-${child.id}`, source: 'self', target: `ch-${child.id}`,
      sourceHandle: 'bottom', targetHandle: 'top', type: 'step',
      style: { stroke: 'rgba(255,255,255,0.15)', strokeDasharray: '4 3' },
    })

    childSpouses.forEach((sp, j) => {
      const spNodeId = `chsp-${sp.id}-of-${child.id}`
      nodes.push({
        id: spNodeId, type: 'person',
        position: { x: childNodeX + NODE_W + (j + 1) * H_GAP + j * NODE_W, y: Y_CHILDREN },
        data: { ...sp, personId: sp.id, relationship: 'Spouse' },
      })
      edges.push({
        id: `e-${spNodeId}`, source: `ch-${child.id}`, target: spNodeId,
        sourceHandle: 'right', targetHandle: 'left', type: 'straight',
        style: { stroke: 'rgba(251,113,133,0.5)', strokeWidth: 1.5 },
      })
    })

    if (grandchildren.length > 0) {
      const childCX = childNodeX + NODE_W / 2
      const spCX2 = childSpouses.length > 0 ? childNodeX + NODE_W + H_GAP + NODE_W / 2 : childCX
      const gcMidX = (childCX + spCX2) / 2
      const gcTotalW = grandchildren.length * NODE_W + (grandchildren.length - 1) * H_GAP
      const gcStartX = gcMidX - gcTotalW / 2

      grandchildren.forEach((gc, j) => {
        nodes.push({
          id: `gc-${gc.id}`, type: 'person',
          position: { x: gcStartX + j * (NODE_W + H_GAP), y: Y_GRANDCHILDREN },
          data: { ...gc, personId: gc.id, relationship: 'Grandchild' },
        })
        edges.push({
          id: `e-gc-${gc.id}`, source: `ch-${child.id}`, target: `gc-${gc.id}`,
          sourceHandle: 'bottom', targetHandle: 'top', type: 'step',
          style: { stroke: 'rgba(255,255,255,0.12)', strokeDasharray: '4 3' },
        })
      })
    }

    cursorX += unitWidth + UNIT_GAP
  })

  // Add-child button after the last child unit
  nodes.push({
    id: 'action-child', type: 'action',
    position: { x: cursorX - UNIT_GAP + H_GAP, y: Y_CHILDREN + (NODE_H - ACT) / 2 },
    data: { actionType: 'child', label: 'Add child' },
  })

  return { nodes, edges }
}

function PersonNode({ data }) {
  const label = data.known_as || data.name
  const base = data.small ? 'w-24 h-16 text-xs' : 'w-32 h-24 text-sm'
  const style = data.isSelf
    ? 'border border-white/40 bg-white/10 text-white'
    : 'border border-white/25 bg-white/5 text-white/80 cursor-pointer hover:bg-white/10 hover:border-white/40 transition-colors'

  return (
    <div className={`${base} ${style} rounded-xl flex flex-col items-center justify-center px-2 text-center`}>
      <Handle type="target" id="top"    position={Position.Top}    className="!opacity-0 !w-1 !h-1 !min-w-0 !min-h-0" />
      <Handle type="source" id="bottom" position={Position.Bottom} className="!opacity-0 !w-1 !h-1 !min-w-0 !min-h-0" />
      <Handle type="target" id="left"   position={Position.Left}   className="!opacity-0 !w-1 !h-1 !min-w-0 !min-h-0" />
      <Handle type="source" id="right"  position={Position.Right}  className="!opacity-0 !w-1 !h-1 !min-w-0 !min-h-0" />
      <span className="font-medium leading-tight">{label}</span>
      {data.birth_date && (
        <span className="text-white/30 text-xs mt-0.5">{data.birth_date.slice(0, 4)}</span>
      )}
      {data.relationship && !data.isSelf && (
        <span className="text-white/25 text-xs mt-0.5 uppercase tracking-wider">{data.relationship}</span>
      )}
    </div>
  )
}

function ActionNode({ data }) {
  return (
    <div
      className="flex items-center justify-center rounded-full border border-dashed border-white/25 bg-transparent cursor-pointer hover:border-white/60 hover:bg-white/8 transition-all group"
      style={{ width: ACT, height: ACT }}
      title={data.label}
    >
      <Plus size={12} className="text-white/30 group-hover:text-white/70 transition-colors" />
    </div>
  )
}

const nodeTypes = { person: PersonNode, action: ActionNode }

export function PersonAncestry() {
  const { person, relatives, reloadRelatives } = useOutletContext()
  const navigate = useNavigate()
  const [childRelatives, setChildRelatives] = useState({})
  const [rfInstance, setRfInstance] = useState(null)
  const [modalAction, setModalAction] = useState(null)

  useEffect(() => {
    setChildRelatives({})
    if (!relatives?.children?.length) return
    relatives.children.forEach(child => {
      getRelatives(child.id)
        .then(r => setChildRelatives(prev => ({ ...prev, [child.id]: r })))
        .catch(() => {})
    })
  }, [relatives])

  const allChildrenLoaded = !relatives?.children?.length
    || relatives.children.every(c => childRelatives[c.id])

  useEffect(() => {
    if (rfInstance && allChildrenLoaded) {
      rfInstance.fitView({ padding: 0.2, duration: 400 })
    }
  }, [rfInstance, allChildrenLoaded])

  const { nodes, edges } = useMemo(
    () => relatives ? buildGraph(person, relatives, childRelatives) : { nodes: [], edges: [] },
    [person, relatives, childRelatives]
  )

  const onNodeClick = useCallback((_, node) => {
    if (node.type === 'action') {
      setModalAction({
        type: node.data.actionType,
        personId: person.id,
        parentIds: relatives?.parents?.map(p => p.id) || [],
      })
      return
    }
    if (!node.data.isSelf && node.data.personId) {
      startTransition(() => navigate(`/manage/people/${node.data.personId}/ancestry`))
    }
  }, [navigate, person?.id, relatives])

  if (!relatives) return <div className="text-white/30 text-sm">Loading…</div>

  return (
    <>
      <div key={person.id} className="h-[640px] rounded-xl overflow-hidden border border-white/5">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onInit={setRfInstance}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          colorMode="dark"
          style={{ background: 'transparent' }}
        >
          <Background color="rgba(255,255,255,0.04)" gap={24} size={1} />
        </ReactFlow>
      </div>

      {modalAction && (
        <AddRelativeModal
          action={modalAction}
          onClose={() => setModalAction(null)}
          onSuccess={() => {
            setModalAction(null)
            reloadRelatives()
          }}
        />
      )}
    </>
  )
}
