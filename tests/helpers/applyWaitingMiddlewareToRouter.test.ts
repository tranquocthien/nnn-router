import { NnnRouter } from '../../src/types'
import applyWaitingMiddlewareToRouter from '../../src/helpers/applyWaitingMiddlewareToRouter'
import Router from 'express/lib/router'
import { createRequest, createResponse } from 'node-mocks-http'
import EventEmitter from 'events'

const createResponseOf = (req: ReturnType<typeof createRequest>) =>
  createResponse({
    req,
    eventEmitter: EventEmitter,
  })

let router: NnnRouter
let promise: Promise<void>
let resolve: Function
let reject: Function
let req: ReturnType<typeof createRequest>
let res: ReturnType<typeof createResponseOf>
let app: (req: ReturnType<typeof createRequest>, res: ReturnType<typeof createResponseOf>) => void
beforeEach(() => {
  router = Router() as NnnRouter
  promise = new Promise((rs, rj) => {
    resolve = rs
    reject = rj
  })
  router.promise = () => promise
  app = (req, res) => router(req, res, (err) => (err ? res.emit('error', err) : res.end()))
  applyWaitingMiddlewareToRouter(router)
  req = createRequest({
    method: 'GET',
    path: '/',
  })
  res = createResponseOf(req)
})

describe('Test function applyWaitingMiddlewareToRouter', () => {
  it('Request will be suspended if the promise is pending', async () => {
    app(req, res)
    expect(res._isEndCalled()).toBe(false)
  })

  it('Request will be continue after the promise is fulfilled', async () => {
    app(req, res)
    await new Promise((rs, rj) => {
      res.on('finish', rs).on('error', rj)
      resolve()
    })
  })

  it('Request will be failed after the promise is rejected', async () => {
    app(req, res)
    const err = new Error('sample error')
    await expect(
      new Promise((rs, rj) => {
        res.on('finish', rs).on('error', rj)
        reject(err)
      })
    ).rejects.toBe(err)
  })

  describe('Test removeLayerMiddleware', () => {
    it('should remove layerMiddleware from router.stack after the promise is fulfilled and have no request that is inprogress', async () => {
      app(req, res)
      await new Promise((rs, rj) => {
        res.on('finish', rs).on('error', rj)
        resolve()
      })
      expect(router.stack).toHaveLength(0)
    })

    it('should not remove layerMiddleware from router.stack after the promise is fulfilled and have request that is inprogress', async () => {
      const req2 = createRequest({
        method: 'POST',
        path: '/',
      })
      const res2 = createResponseOf(req2)
      await new Promise((rs, rj) => {
        res.on('finish', rs).on('error', rj)
        app(req, res)
        // res2 is never finished
        router(req2, res2, () => {})
        resolve()
      })
      expect(res2._isEndCalled()).toBe(false)
      expect(router.stack).not.toHaveLength(0)
    })

    it('should remove layerMiddleware from router.stack after the promise is fulfilled and all requests are finished', async () => {
      const req2 = createRequest({
        method: 'POST',
        path: '/',
      })
      const res2 = createResponseOf(req2)
      await new Promise((rs, rj) => {
        res.on('finish', rs).on('error', rj)
        app(req, res)
        // res2 is never finished
        router(req2, res2, () => {})
        resolve()
      })
      expect(router.stack).not.toHaveLength(0)
      await new Promise((rs, rj) => {
        res2.on('finish', rs).on('error', rj)
        res2.end()
      })
      expect(router.stack).toHaveLength(0)
    })

    it('request will be failed after the promise is rejected', async () => {
      app(req, res)
      const err = new Error('sample error')
      await expect(
        new Promise((rs, rj) => {
          res.on('finish', rs).on('error', rj)
          reject(err)
        })
      ).rejects.toBe(err)
    })
  })
})
