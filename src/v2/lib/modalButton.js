import { C } from '../ui/tokens'

/**
 * The two buttons every dialog ends with: one that does the thing, one that
 * does not. Shared so a Cancel is the same shape wherever it appears.
 */
export const modalButton = (primary, disabled) => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  height: 34, padding: '0 16px', borderRadius: 17, fontSize: 13,
  border: primary ? 0 : `1px solid ${C.border}`,
  background: primary ? C.activeText : 'transparent',
  color: primary ? '#fff' : C.text,
  opacity: disabled ? 0.5 : 1,
  cursor: disabled ? 'default' : 'pointer',
})
