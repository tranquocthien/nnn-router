import path from 'path'
import util from 'util'
import EventEmitter from 'events'
import chalk from 'chalk'
import { createRequest, createResponse } from 'node-mocks-http'
import nnnRouter, { NnnRouter } from '../src/index'
import {
  permissionId,
  sampleParamGetBooks,
  sampleParamTraceBooks1,
  sampleParamTraceBooks2,
  userId,
} from './data.mocks'
import { ErrorRequestHandler } from 'express-serve-static-core'

const routeDir = path.relative(process.cwd(), path.join(__dirname, 'routes'))
const router = nnnRouter({
  routeDir,
})
const errorRequestHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(500).send(err.message)
}
router.use(errorRequestHandler)

const createResponseOf = (req: ReturnType<typeof createRequest>) =>
  createResponse({
    req,
    eventEmitter: EventEmitter,
  })

const waitResponse = (
  req: ReturnType<typeof createRequest>,
  res: ReturnType<typeof createResponse>,
  r: NnnRouter = router
) =>
  new Promise((resolve, reject) => {
    res.once('finish', resolve)
    res.once('error', reject)
    r(req, res, (err) => (err ? res.emit('error', err) : res.end()))
  })

const testGetBookCount = async function () {
  const req = createRequest({
    method: 'GET',
    url: '/books/count',
  })
  const res = createResponseOf(req)
  await waitResponse(req, res)
  expect(res._getData()).toEqual('Counting books')
}
const testMiddlewareOfBookId = async function () {
  const req = createRequest({
    method: 'GET',
    url: '/books/1',
    params: { bookId: 1 },
  })
  const res = createResponseOf(req)
  await waitResponse(req, res)
  expect(req.userId).toEqual(userId)
  expect(req.permissionId).toEqual(permissionId)
  const req2 = createRequest({
    method: 'GET',
    url: '/books/1/authors/2',
    params: { bookId: 1, authorId: 2 },
  })
  const res2 = createResponseOf(req2)
  await waitResponse(req2, res2)
  expect(req2.userId).toEqual(userId)
  expect(req2.permissionId).toEqual(permissionId)
}

describe(`Test ${chalk.yellowBright('middlewareWaitingForInit')}`, function () {
  function sendRequests() {
    return Promise.all([testGetBookCount.call(this), testMiddlewareOfBookId.call(this)])
  }
  it('Send 2 requests before router have been initialized', async function () {
    expect(util.inspect(router.promise())).toEqual('Promise { <pending> }')
    await sendRequests.call(this)
  })
  it('Send 2 requests after router have been initialized', async function () {
    await router.promise()
    await sendRequests.call(this)
  })
})

describe('Test Request Response', function () {
  it('GET /', async function () {
    const req = createRequest({
      method: 'GET',
      url: '/',
    })
    const res = createResponseOf(req)
    await waitResponse(req, res)
    expect(res._getData()).toEqual('Get root')
  })
  it('GET /:id', async function () {
    const req = createRequest({
      method: 'GET',
      url: '/1',
      params: { id: 1 },
    })
    const res = createResponseOf(req)
    await waitResponse(req, res)
    expect(res._getData()).toEqual('Get root id: 1')
  })
  it('GET /books', async function () {
    const req = createRequest({
      method: 'GET',
      url: '/books',
    })
    const res = createResponseOf(req)
    await waitResponse(req, res)
    expect(res._getData()).toEqual('Get books')
  })
  it('TRACE /books', async function () {
    const req = createRequest({
      method: 'TRACE',
      url: '/books',
    })
    const res = createResponseOf(req)
    await waitResponse(req, res)
    expect(res._getData()).toEqual('Tracing books')
  })
  it('Passing middleware function of method GET /books', async function () {
    const req = createRequest({
      method: 'GET',
      url: '/books',
    })
    const res = createResponseOf(req)
    await waitResponse(req, res)
    expect(req.sampleParam).toEqual(sampleParamGetBooks)
  })
  it('Passing array of middleware of method TRACE /books', async function () {
    const req = createRequest({
      method: 'TRACE',
      url: '/books',
    })
    const res = createResponseOf(req)
    await waitResponse(req, res)
    expect(req.sampleParam).toEqual(sampleParamTraceBooks1 + sampleParamTraceBooks2)
  })
  it('GET /books/count', testGetBookCount)
  it('Passing middleware for route /books/:bookId', testMiddlewareOfBookId)
  it('HEAD /books/:bookId', async function () {
    const req = createRequest({
      method: 'HEAD',
      url: '/books/1',
      params: { bookId: 1 },
    })
    const res = createResponseOf(req)
    await waitResponse(req, res)
    expect(res._getData()).toEqual('Head bookId: 1')
  })
  it('GET /books/:bookId', async function () {
    const req = createRequest({
      method: 'GET',
      url: '/books/1',
      params: { bookId: 1 },
    })
    const res = createResponseOf(req)
    await waitResponse(req, res)
    expect(res._getStatusCode()).toEqual(500)
    expect(res._getData()).toEqual('Sample error while getting book 1')
  })
  it('GET /books/:bookId/authors/:authorId', async function () {
    const req = createRequest({
      method: 'GET',
      url: '/books/1/authors/2',
      params: { bookId: 1, authorId: 2 },
    })
    const res = createResponseOf(req)
    await waitResponse(req, res)
    expect(res._getData()).toEqual('Get bookId 1 => authorId 2')
  })
})

describe(`Test option ${chalk.inverse('absolutePath')}`, function () {
  it('GET /', async function () {
    const router = nnnRouter({
      routeDir,
      absolutePath: path.join(__dirname, 'other-routes'),
    })
    const req = createRequest({
      method: 'GET',
      url: '/',
    })
    const res = createResponseOf(req)
    await waitResponse(req, res, router)
    expect(res._getData()).toEqual('Get root of other')
  })
})

describe(`Test initializing router without options`, () => {
  let router: NnnRouter
  let spyProcessCwd: jest.SpyInstance<string>
  beforeAll(() => {
    spyProcessCwd = jest.spyOn(process, 'cwd').mockReturnValue(__dirname)
    router = nnnRouter()
  })
  afterAll(() => {
    spyProcessCwd.mockRestore()
  })
  it('GET /', async function () {
    const req = createRequest({
      method: 'GET',
      url: '/',
    })
    const res = createResponseOf(req)
    await waitResponse(req, res, router)
    expect(res._getData()).toEqual('Get root')
  })
})
