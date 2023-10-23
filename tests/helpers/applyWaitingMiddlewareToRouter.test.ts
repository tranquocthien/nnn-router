import { Router } from 'express-serve-static-core'
import applyWaitingMiddlewareToRouter from '../../src/helpers/applyWaitingMiddlewareToRouter'
import express from 'express'
import { createRequest, createResponse } from 'node-mocks-http'
import EventEmitter from 'events'

const createResponseOf = (req: ReturnType<typeof createRequest>) =>
  createResponse({
    req,
    eventEmitter: EventEmitter,
  })

let router: Router
let promise: Promise<void>
let resolve: Function
let reject: Function
let req: ReturnType<typeof createRequest>
let res: ReturnType<typeof createResponseOf>
let app: (req: ReturnType<typeof createRequest>, res: ReturnType<typeof createResponseOf>) => void
beforeEach(() => {
  router = express.Router()
  app = (req, res) => router(req, res, (err) => (err ? res.emit('error', err) : res.end()))
  promise = new Promise((rs, rj) => {
    resolve = rs
    reject = rj
  })
  applyWaitingMiddlewareToRouter(router, promise)
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
      app(req, res)
      router(req2, res2, () => {})
      await new Promise((rs, rj) => {
        res.on('finish', rs).on('error', rj)
        resolve()
      })
      expect(res2._isEndCalled()).toBe(false)
      expect(router.stack).not.toHaveLength(0)
    })
  })
})
