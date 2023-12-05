import { Response } from 'express-serve-static-core'
import { NnnRouter } from '../types'

/**
 * All requests which are sent before router is initialized will be waiting for router to be initialized.
 */
const applyWaitingMiddlewareToRouter = (router: NnnRouter) => {
  const promise = router.promise()
  // Collect of all waiting responses
  const waitingResponses: Response[] = []
  router.use(function waitingForRouteInitialization(req, res, next) {
    // Add `res` to `waitingResponses`
    waitingResponses.push(res)
    res.once('finish', () => {
      // Remove `res` from `waitingResponses` when `res` is finished
      waitingResponses.splice(waitingResponses.indexOf(res), 1)
      removeLayerMiddleware()
    })
    // Wait for `promise` to be fulfilled
    promise.then(next).catch(next)
  })
  const layerMiddleware = router.stack[router.stack.length - 1]
  const removeLayerMiddleware = () => {
    if (waitingResponses.length) return
    // => `waitingResponses` is empty
    // TODO: remove `layerMiddleware` from `router.stack`
    const indexOfLayer = router.stack.indexOf(layerMiddleware)
    if (indexOfLayer >= 0) router.stack.splice(indexOfLayer, 1)
  }
  promise.then(removeLayerMiddleware).catch(() => {})
}

export default applyWaitingMiddlewareToRouter
