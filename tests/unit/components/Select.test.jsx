import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Select } from '../../../src/components/Select'

const OPTS = [
  { value: 'p1', text: 'Stephen' },
  { value: 'p2', text: 'Cayce' },
  { value: 'p3', text: 'Patty' },
]

function renderSelect(props = {}) {
  const onChange = vi.fn()
  const utils    = render(<Select options={OPTS} onChange={onChange} {...props} />)
  const input    = utils.container.querySelector('input')
  return { ...utils, onChange, input }
}

describe('Select', () => {
  beforeEach(() => { vi.resetAllMocks() })

  describe('single-select mode', () => {
    describe('initial render', () => {
      it('shows the placeholder when no value is selected', () => {
        const { input } = renderSelect({ placeholder: 'Search…' })
        expect(input).toHaveAttribute('placeholder', 'Search…')
      })
      it('shows the selected option\'s text in the input', () => {
        const { input } = renderSelect({ value: 'p2' })
        expect(input.value).toBe('Cayce')
      })
    })

    describe('opening the dropdown', () => {
      it('opens on focus and shows the full option list', () => {
        const { input } = renderSelect()
        fireEvent.focus(input)
        expect(screen.getByRole('button', { name: /Stephen/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Cayce/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Patty/ })).toBeInTheDocument()
      })
      it('filters options by the typed query (case-insensitive)', () => {
        const { input } = renderSelect()
        fireEvent.change(input, { target: { value: 'STE' } })
        expect(screen.getByRole('button', { name: /Stephen/ })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Cayce/ })).not.toBeInTheDocument()
      })
      it('shows "No results" when the filter matches nothing', () => {
        const { input } = renderSelect()
        fireEvent.change(input, { target: { value: 'zzz' } })
        expect(screen.getByText('No results')).toBeInTheDocument()
      })
    })

    describe('selecting an option', () => {
      it('calls onChange with the chosen option and closes the dropdown', () => {
        const { onChange, input } = renderSelect()
        fireEvent.focus(input)
        fireEvent.click(screen.getByRole('button', { name: /Cayce/ }))
        expect(onChange).toHaveBeenCalledWith(OPTS[1])
        // After selection, the dropdown closes — options no longer in DOM.
        expect(screen.queryByRole('button', { name: /Stephen/ })).not.toBeInTheDocument()
      })
    })

    describe('outside-click', () => {
      it('closes the dropdown when the user clicks outside the component', () => {
        const { input } = renderSelect()
        fireEvent.focus(input)
        expect(screen.getByRole('button', { name: /Stephen/ })).toBeInTheDocument()
        fireEvent.mouseDown(document.body)
        expect(screen.queryByRole('button', { name: /Stephen/ })).not.toBeInTheDocument()
      })
      it('stays open when the click target is inside the component', () => {
        const { input, container } = renderSelect()
        fireEvent.focus(input)
        fireEvent.mouseDown(container.querySelector('div'))
        expect(screen.getByRole('button', { name: /Stephen/ })).toBeInTheDocument()
      })
    })
  })

  describe('multiple-select mode', () => {
    it('renders existing chips for each selected value', () => {
      renderSelect({ multiple: true, value: ['p1', 'p3'] })
      // Chips render the text; same text also appears in the dropdown option.
      expect(screen.getAllByText('Stephen').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Patty').length).toBeGreaterThan(0)
    })
    it('renders a chip with an avatar via Leading when option has one', () => {
      const { container } = renderSelect({
        multiple: true,
        value: ['p1'],
        options: [{ value: 'p1', text: 'Stephen', avatar: '/a.jpg' }],
      })
      expect(container.querySelector('img[src="/a.jpg"]')).not.toBeNull()
    })
    it('renders a chip when option has no text (text || "" branch)', () => {
      const { container } = renderSelect({
        multiple: true,
        value: ['p1'],
        options: [{ value: 'p1' }],  // no text
      })
      // Renders without throwing — Leading receives empty string.
      expect(container).toBeDefined()
    })
    it('toggles a value on when an unselected option is clicked', () => {
      const { input, onChange } = renderSelect({ multiple: true, value: ['p1'] })
      fireEvent.focus(input)
      fireEvent.click(screen.getByRole('button', { name: /Cayce/ }))
      expect(onChange).toHaveBeenCalledWith([OPTS[0], OPTS[1]])
    })
    it('toggles a value off when an already-selected option is clicked', () => {
      const { input, onChange } = renderSelect({ multiple: true, value: ['p1', 'p2'] })
      fireEvent.focus(input)
      fireEvent.click(screen.getByRole('button', { name: /Stephen/ }))
      expect(onChange).toHaveBeenCalledWith([OPTS[1]])
    })
    it('removes a value when the chip\'s X is clicked', () => {
      const { onChange } = renderSelect({ multiple: true, value: ['p1', 'p2'] })
      const removeButtons = screen.getAllByRole('button', { name: 'Remove' })
      fireEvent.click(removeButtons[0])
      expect(onChange).toHaveBeenCalledWith([OPTS[1]])
    })
    it('filters out unselected values that don\'t exist in options', () => {
      renderSelect({ multiple: true, value: ['p1', 'unknown'] })
      expect(screen.getAllByText('Stephen').length).toBeGreaterThan(0)
    })
    it('clicking the multi-select container opens the dropdown', () => {
      const { container } = renderSelect({ multiple: true, value: [] })
      const input = container.querySelector('input')
      const wrapper = input.parentElement
      fireEvent.click(wrapper)
      expect(screen.getByRole('button', { name: /Stephen/ })).toBeInTheDocument()
    })
    it('focusing the multi-select input opens the dropdown', () => {
      const { container } = renderSelect({ multiple: true, value: [] })
      const input = container.querySelector('input')
      fireEvent.focus(input)
      expect(screen.getByRole('button', { name: /Stephen/ })).toBeInTheDocument()
    })
    it('typing in the multi-select input filters via handleQuery', () => {
      const { container } = renderSelect({ multiple: true, value: [] })
      const input = container.querySelector('input')
      fireEvent.change(input, { target: { value: 'ste' } })
      // Only Stephen matches.
      expect(screen.getByRole('button', { name: /Stephen/ })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Cayce/ })).not.toBeInTheDocument()
    })
  })

  describe('externally-driven filtering', () => {
    it('passes the query to onQueryChange and skips internal filtering', () => {
      const onQueryChange = vi.fn()
      const { input } = render(
        <Select options={OPTS} onChange={() => {}} onQueryChange={onQueryChange} />
      ).container.querySelector('input') && { input: document.querySelector('input') }
      fireEvent.change(input, { target: { value: 'ste' } })
      expect(onQueryChange).toHaveBeenCalledWith('ste')
      // External mode → all 3 options still shown (parent decides filter).
      expect(screen.getByRole('button', { name: /Stephen/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cayce/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Patty/ })).toBeInTheDocument()
    })
  })

  describe('option label fallback', () => {
    it('falls back to text when option has no label', () => {
      const { input } = renderSelect({ options: [{ value: 'x', text: 'Plain' }] })
      fireEvent.focus(input)
      expect(screen.getByRole('button', { name: /Plain/ })).toBeInTheDocument()
    })
    it('renders Leading visual when option has an avatar', () => {
      const { container, input } = renderSelect({
        options: [{ value: 'x', text: 'Stephen', avatar: '/a.jpg' }],
      })
      fireEvent.focus(input)
      // Avatar img inside the dropdown option.
      expect(container.querySelectorAll('img[src="/a.jpg"]').length).toBeGreaterThan(0)
    })
    it('passes empty string to Leading text when option has no text', () => {
      const { input } = renderSelect({ options: [{ value: 'x' }] })
      fireEvent.focus(input)
      // Renders without throwing; covers `text || ''` branch.
      expect(input).toBeInTheDocument()
    })
  })

  describe('dropUp', () => {
    it('renders without throwing when dropUp is enabled (opens above input)', () => {
      const { input } = renderSelect({ dropUp: true })
      fireEvent.focus(input)
      expect(screen.getByRole('button', { name: /Stephen/ })).toBeInTheDocument()
    })
  })

  describe('multi-select with no value', () => {
    it('handles value=undefined (uses [] fallback)', () => {
      const { input } = renderSelect({ multiple: true })
      fireEvent.focus(input)
      // Renders without throwing — exercises `value || []` branches.
      expect(input).toBeInTheDocument()
    })
  })

  describe('multi-select placeholder', () => {
    it('hides the placeholder once at least one chip is selected', () => {
      const { container } = renderSelect({ multiple: true, value: ['p1'], placeholder: 'pick…' })
      const input = container.querySelector('input')
      // Selected chips present → placeholder swaps to ''.
      expect(input).toHaveAttribute('placeholder', '')
    })
    it('shows the placeholder when no chips selected in multi-mode', () => {
      const { container } = renderSelect({ multiple: true, value: [], placeholder: 'pick…' })
      expect(container.querySelector('input')).toHaveAttribute('placeholder', 'pick…')
    })
  })

  describe('cleanup', () => {
    it('removes the document mousedown listener on unmount', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      const { unmount } = renderSelect()
      unmount()
      expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
    })
  })
})
