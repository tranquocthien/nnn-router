import type { ErrorRequestHandler, RequestHandler } from 'express-serve-static-core'
import type { AsyncErrorRequestHandler, AsyncRequestHandler } from '../types'

export const isFunction = (func: any): func is (...args: any[]) => any => typeof func === 'function'

const wrapAsyncRequestHandler =
  (func: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    func(req, res, next).catch(next)
  }

const wrapAsyncErrorRequestHandler =
  (func: AsyncErrorRequestHandler): ErrorRequestHandler =>
  (error, req, res, next) => {
    func(error, req, res, next).catch(next)
  }

const sampleAsyncFunction = async function sampleAsyncFunction() {}
const isAsyncHandler = (
  func: RequestHandler | AsyncRequestHandler | ErrorRequestHandler | AsyncErrorRequestHandler
): func is AsyncRequestHandler | AsyncErrorRequestHandler =>
  func.constructor === sampleAsyncFunction.constructor

const isErrorHandler = (
  func: AsyncRequestHandler | AsyncErrorRequestHandler
): func is AsyncErrorRequestHandler => func.length === 4

export const requestHandlerMapper = (
  func: RequestHandler | AsyncRequestHandler | ErrorRequestHandler | AsyncErrorRequestHandler
) =>
  isAsyncHandler(func)
    ? isErrorHandler(func)
      ? wrapAsyncErrorRequestHandler(func)
      : wrapAsyncRequestHandler(func)
    : func
