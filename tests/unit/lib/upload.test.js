import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadMedia, getUploadStatus } from '../../../src/lib/upload'

const jsonRes = (body, ok = true) => ({ ok, json: () => Promise.resolve(body) })

beforeEach(() => { globalThis.fetch = vi.fn() })
afterEach(() => { vi.restoreAllMocks() })

describe('uploadMedia', () => {
  const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' })
  const fileB = new File(['b'], 'b.mov', { type: 'video/quicktime' })

  it('POSTs every file plus the destination to the upload endpoint', async () => {
    fetch.mockResolvedValue(jsonRes({ id: 'job1' }))
    await uploadMedia([fileA, fileB], 'gallery')

    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/api/gallery/upload')
    expect(opts.method).toBe('POST')
    expect(opts.body.getAll('files')).toEqual([fileA, fileB])
    expect(opts.body.get('destination')).toBe('gallery')
  })

  it('defaults destination to staging', async () => {
    fetch.mockResolvedValue(jsonRes({ id: 'job1' }))
    await uploadMedia([fileA])
    expect(fetch.mock.calls[0][1].body.get('destination')).toBe('staging')
  })

  it('returns the parsed job body', async () => {
    const job = { id: 'job7', status: 'running', files: [] }
    fetch.mockResolvedValue(jsonRes(job))
    await expect(uploadMedia([fileA])).resolves.toEqual(job)
  })

  it('throws the server detail when the request fails', async () => {
    fetch.mockResolvedValue(jsonRes({ detail: 'destination must be gallery or staging' }, false))
    await expect(uploadMedia([fileA])).rejects.toThrow('destination must be gallery or staging')
  })

  it('falls back to a generic message when the error body has no detail', async () => {
    fetch.mockResolvedValue(jsonRes({}, false))
    await expect(uploadMedia([fileA])).rejects.toThrow('Upload failed')
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    fetch.mockResolvedValue({ ok: false, json: () => Promise.reject(new Error('not json')) })
    await expect(uploadMedia([fileA])).rejects.toThrow('Upload failed')
  })
})

describe('getUploadStatus', () => {
  it('GETs the job by id and returns the parsed body', async () => {
    const job = { id: 'job7', status: 'done' }
    fetch.mockResolvedValue(jsonRes(job))
    await expect(getUploadStatus('job7')).resolves.toEqual(job)
    expect(fetch).toHaveBeenCalledWith('/api/gallery/upload/job7')
  })

  it('throws when the job cannot be fetched', async () => {
    fetch.mockResolvedValue(jsonRes({}, false))
    await expect(getUploadStatus('nope')).rejects.toThrow('Failed to fetch upload status')
  })
})
