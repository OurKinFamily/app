import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getPeople, getPerson, getRelatives, searchPeople, createPerson,
  getFaces, getPhotos, setAvatar, unassignFace, deleteMedia, redateMedia, setCover,
  addRelationship, getClusters, getCluster, assignCluster, skipCluster,
  unskipCluster,
} from '../../../src/lib/api'
import { mockFetch, mockFetchFail } from '../helpers'

// The api module is a thin wrapper over fetch — every export hits one URL,
// throws a named error on !ok, and (for GETs) returns the parsed JSON. The
// tests below pin (a) the URL/method/body shape and (b) the error message.

describe('api', () => {
  beforeEach(() => { vi.resetAllMocks() })

  function lastCall() {
    return global.fetch.mock.calls.at(-1)
  }
  function lastBody() {
    const init = lastCall()[1]
    return init?.body ? JSON.parse(init.body) : undefined
  }

  describe('getPeople', () => {
    it('GETs /api/people/ and returns the parsed body', async () => {
      mockFetch([{ id: 'p1', name: 'Test' }])
      const out = await getPeople()
      expect(lastCall()[0]).toBe('/api/people/')
      expect(out).toEqual([{ id: 'p1', name: 'Test' }])
    })
    it('throws "Failed to fetch people" when the response is not ok', async () => {
      mockFetch(null, { ok: false })
      await expect(getPeople()).rejects.toThrow('Failed to fetch people')
    })
  })

  describe('getPerson', () => {
    it('GETs /api/people/{id} and returns the body', async () => {
      mockFetch({ id: 'p1' })
      const out = await getPerson('p1')
      expect(lastCall()[0]).toBe('/api/people/p1')
      expect(out).toEqual({ id: 'p1' })
    })
    it('throws "Person not found" on a non-ok response', async () => {
      mockFetch(null, { ok: false })
      await expect(getPerson('p1')).rejects.toThrow('Person not found')
    })
  })

  describe('getRelatives', () => {
    it('GETs /api/people/{id}/relatives', async () => {
      mockFetch({ parents: [] })
      await getRelatives('p1')
      expect(lastCall()[0]).toBe('/api/people/p1/relatives')
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(getRelatives('p1')).rejects.toThrow('Failed to fetch relatives')
    })
  })

  describe('searchPeople', () => {
    it('URL-encodes the query string', async () => {
      mockFetch([])
      await searchPeople('hello world & cayce')
      expect(lastCall()[0]).toBe('/api/people/search?q=hello%20world%20%26%20cayce')
    })
    it('throws "Search failed" on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(searchPeople('x')).rejects.toThrow('Search failed')
    })
  })

  describe('createPerson', () => {
    it('POSTs JSON to /api/people/ and returns the response body', async () => {
      mockFetch({ id: 'new-id' })
      const out = await createPerson({ name: 'Stephen' })
      const [url, init] = lastCall()
      expect(url).toBe('/api/people/')
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe('application/json')
      expect(JSON.parse(init.body)).toEqual({ name: 'Stephen' })
      expect(out).toEqual({ id: 'new-id' })
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(createPerson({})).rejects.toThrow('Failed to create person')
    })
  })

  describe('getFaces', () => {
    it('GETs /api/people/{id}/faces', async () => {
      mockFetch([])
      await getFaces('p1')
      expect(lastCall()[0]).toBe('/api/people/p1/faces')
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(getFaces('p1')).rejects.toThrow('Failed to fetch faces')
    })
  })

  describe('getPhotos', () => {
    it('uses default pagination (limit=100, offset=0) when none is given', async () => {
      mockFetch([])
      await getPhotos('p1')
      expect(lastCall()[0]).toBe('/api/people/p1/photos?limit=100&offset=0')
    })
    it('honors caller-supplied limit and offset', async () => {
      mockFetch([])
      await getPhotos('p1', 50, 200)
      expect(lastCall()[0]).toBe('/api/people/p1/photos?limit=50&offset=200')
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(getPhotos('p1')).rejects.toThrow('Failed to fetch photos')
    })
  })

  describe('setAvatar', () => {
    it('PUTs { crop_path } to /api/people/{id}/avatar', async () => {
      mockFetch(null)
      await setAvatar('p1', 'foo/bar.jpg')
      const [url, init] = lastCall()
      expect(url).toBe('/api/people/p1/avatar')
      expect(init.method).toBe('PUT')
      expect(JSON.parse(init.body)).toEqual({ crop_path: 'foo/bar.jpg' })
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(setAvatar('p1', 'x')).rejects.toThrow('Failed to set avatar')
    })
  })

  describe('unassignFace', () => {
    it('DELETEs /api/faces/assignment with the right query string', async () => {
      mockFetch(null)
      await unassignFace('p1', 'archive/foo.jpg', 2)
      const [url, init] = lastCall()
      expect(init.method).toBe('DELETE')
      expect(url).toBe(
        '/api/faces/assignment?person_id=p1&photo_path=archive%2Ffoo.jpg&face_index=2'
      )
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(unassignFace('p1', 'x', 0)).rejects.toThrow('Failed to unassign face')
    })
  })

  describe('deleteMedia', () => {
    it('DELETEs /api/gallery/media with the URL-encoded path', async () => {
      mockFetch(null)
      await deleteMedia('archive/2020/01/foo bar.jpg')
      const [url, init] = lastCall()
      expect(init.method).toBe('DELETE')
      expect(url).toBe('/api/gallery/media?path=archive%2F2020%2F01%2Ffoo%20bar.jpg')
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(deleteMedia('x')).rejects.toThrow('Failed to delete media')
    })
  })

  describe('redateMedia', () => {
    it('PATCHes /api/gallery/media with the timestamp + precision body', async () => {
      mockFetch({ path: 'x', timestamp: '2000-01-01T12:00:00' })
      const out = await redateMedia('archive/2000/01/x.jpg', { timestamp: '2000-01-01T12:00:00', precision: 'year' })
      const [url, init] = lastCall()
      expect(url).toBe('/api/gallery/media?path=archive%2F2000%2F01%2Fx.jpg')
      expect(init.method).toBe('PATCH')
      expect(lastBody()).toEqual({ timestamp: '2000-01-01T12:00:00', precision: 'year' })
      expect(out).toEqual({ path: 'x', timestamp: '2000-01-01T12:00:00' })
    })
    it('surfaces the server-side detail message when present', async () => {
      mockFetch({ detail: 'timestamp must be ISO-8601: bad' }, { ok: false })
      await expect(
        redateMedia('x', { timestamp: 'bad', precision: 'day' })
      ).rejects.toThrow('timestamp must be ISO-8601: bad')
    })
    it('falls back to a generic message when the body is JSON but has no detail field', async () => {
      mockFetch({}, { ok: false })
      await expect(
        redateMedia('x', { timestamp: 'bad', precision: 'day' })
      ).rejects.toThrow('Failed to redate media')
    })
    it('falls back to a generic message when the server response is unparseable', async () => {
      // !ok response whose .json() rejects → catch fires, generic message
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new Error('not json')),
      })
      await expect(
        redateMedia('x', { timestamp: 'bad', precision: 'day' })
      ).rejects.toThrow('Failed to redate media')
    })
  })

  describe('setCover', () => {
    it('PUTs { photo_path, position } to /api/people/{id}/cover', async () => {
      mockFetch(null)
      await setCover('p1', 'archive/x.jpg', 'top')
      expect(lastCall()[1].method).toBe('PUT')
      expect(lastBody()).toEqual({ photo_path: 'archive/x.jpg', position: 'top' })
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(setCover('p1', 'x', 'top')).rejects.toThrow('Failed to set cover')
    })
  })

  describe('addRelationship', () => {
    it('POSTs the payload to /api/people/{id}/relationships', async () => {
      mockFetch(null)
      await addRelationship('p1', { type: 'parent', other_id: 'p2' })
      expect(lastCall()[1].method).toBe('POST')
      expect(lastBody()).toEqual({ type: 'parent', other_id: 'p2' })
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(addRelationship('p1', {})).rejects.toThrow('Failed to add relationship')
    })
  })

  describe('getClusters', () => {
    it('defaults to status=unassigned, limit=100, offset=0', async () => {
      mockFetch([])
      await getClusters()
      expect(lastCall()[0]).toBe('/api/faces/clusters?status=unassigned&limit=100&offset=0')
    })
    it('passes through status/limit/offset', async () => {
      mockFetch([])
      await getClusters('assigned', 50, 25)
      expect(lastCall()[0]).toBe('/api/faces/clusters?status=assigned&limit=50&offset=25')
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(getClusters()).rejects.toThrow('Failed to fetch clusters')
    })
  })

  describe('getCluster', () => {
    it('GETs /api/faces/clusters/{id}', async () => {
      mockFetch({ id: 'c1' })
      await getCluster('c1')
      expect(lastCall()[0]).toBe('/api/faces/clusters/c1')
    })
    it('throws "Cluster not found" on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(getCluster('c1')).rejects.toThrow('Cluster not found')
    })
  })

  describe('assignCluster', () => {
    it('POSTs { person_id, exclude: null, include: null } by default', async () => {
      mockFetch(null)
      await assignCluster('c1', 'p1')
      expect(lastBody()).toEqual({ person_id: 'p1', exclude: null, include: null })
    })
    it('passes exclude as an array when non-empty', async () => {
      mockFetch(null)
      await assignCluster('c1', 'p1', { exclude: ['f1', 'f2'] })
      expect(lastBody()).toEqual({ person_id: 'p1', exclude: ['f1', 'f2'], include: null })
    })
    it('passes include through verbatim', async () => {
      mockFetch(null)
      await assignCluster('c1', 'p1', { include: ['only-this'] })
      expect(lastBody()).toEqual({ person_id: 'p1', exclude: null, include: ['only-this'] })
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(assignCluster('c1', 'p1')).rejects.toThrow('Failed to assign cluster')
    })
  })

  describe('skipCluster', () => {
    it('POSTs to /api/faces/clusters/{id}/skip', async () => {
      mockFetch(null)
      await skipCluster('c1')
      const [url, init] = lastCall()
      expect(url).toBe('/api/faces/clusters/c1/skip')
      expect(init.method).toBe('POST')
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(skipCluster('c1')).rejects.toThrow('Failed to skip cluster')
    })
  })

  describe('unskipCluster', () => {
    it('POSTs to /api/faces/clusters/{id}/unskip', async () => {
      mockFetch(null)
      await unskipCluster('c1')
      expect(lastCall()[0]).toBe('/api/faces/clusters/c1/unskip')
    })
    it('throws on non-ok', async () => {
      mockFetch(null, { ok: false })
      await expect(unskipCluster('c1')).rejects.toThrow('Failed to unskip cluster')
    })
  })

  describe('network failure', () => {
    it('lets fetch rejections propagate (not swallowed by !ok check)', async () => {
      mockFetchFail(new Error('offline'))
      await expect(getPeople()).rejects.toThrow('offline')
    })
  })
})
