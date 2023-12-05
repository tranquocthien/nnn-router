import type { RequestHandler, Router } from 'express-serve-static-core'
import chalk from 'chalk'
import path from 'path'
import type { AsyncRequestHandler, Options, RouteModule } from '../types'
import { reqMethods } from '../constants'

type IsFunction = (func: any) => func is (...args: any[]) => any
const isFunction = ((func: any) => typeof func === 'function') as IsFunction
const wrapAsyncRequestHandler =
  (func: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    func(req, res, next).catch(next)
  }
const sampleAsyncFunction = async () => {}
const isAsyncRequestHandler = (func: RequestHandler | AsyncRequestHandler): func is AsyncRequestHandler =>
  func.constructor === sampleAsyncFunction.constructor
const requestHandlerMapper = (func: RequestHandler | AsyncRequestHandler) =>
  isAsyncRequestHandler(func) ? wrapAsyncRequestHandler(func) : func

const debugPrefix = chalk.greenBright('[NnnRouter][DEBUG] ')

const isESM = !(typeof require === 'function' && typeof module === 'object')

export const parseMethodAndRoutePathFromFilePath = (relativeFilePath: string) => {
  const indexOfLastSlash = relativeFilePath.lastIndexOf('/')
  const methodName = relativeFilePath.slice(
    indexOfLastSlash + 1,
    relativeFilePath.lastIndexOf('.')
  ) as (typeof reqMethods)[number]
  const isValidMethod = reqMethods.includes(methodName)
  if (!isValidMethod) {
    return null
  }
  const routePath =
    indexOfLastSlash >= 0
      ? ('/' + relativeFilePath.slice(0, indexOfLastSlash)).replace(/\/_/g, '/:')
      : '/'
  return {
    methodName,
    routePath,
    relativeFilePath,
  }
}

export const getAPIConfigs = (relativeFilePaths: string[]) => {
  return relativeFilePaths
    .map(parseMethodAndRoutePathFromFilePath)
    .filter(Boolean)
    .sort((config1, config2) => {
      /**
       * Place middleware on top. For example:
       * - Middleware /me
       * - GET        /me
       * - GET        /me/abc
       * Notice that "Middleware /me" is not necessary to place before "GET /meme"
       */
      if (
        config1.routePath.startsWith(config2.routePath + '/') &&
        config2.methodName === reqMethods[0]
      ) {
        return 1
      }
      if (
        config2.routePath.startsWith(config1.routePath + '/') &&
        config1.methodName === reqMethods[0]
      ) {
        return -1
      }

      // Descending sort for exception handling at dynamic routes
      if (config1.routePath !== config2.routePath)
        return config1.routePath < config2.routePath ? 1 : -1
      // Orderring by index in reqMethods
      return reqMethods.indexOf(config1.methodName) - reqMethods.indexOf(config2.methodName)
    })
}

/**
 * Use "for ... of ..." instead of Promise.all
 * to fix [this issue](https://github.com/jestjs/jest/issues/11434) for jest.
 * Declare `absoluteFilePath` to fix [this issue](https://github.com/esbuild-kit/tsx/issues/192) for tsx
 */
export const resolveModulesFromAPIConfigs = async (
  relativeFilePaths: string[],
  absoluteRouteDir: string
) => {
  const modules: RouteModule[] = []
  for (const relativeFilePath of relativeFilePaths) {
    const absoluteFilePath =
      (isESM ? 'file://' : '') + path.join(absoluteRouteDir, relativeFilePath)
    const module = await import(absoluteFilePath)
    modules.push(module)
  }
  return modules
}

const getDebugMessage = ({ methodName, routePath }) =>
  methodName === reqMethods[0]
    ? `Applying middleware for route:${chalk.bold(' ')}${routePath}`
    : `Applying route ${chalk.bold(methodName.toUpperCase())} ${routePath}`

export const applyAPIConfigsToRouter = (
  router: Router,
  apiConfigs: Awaited<ReturnType<typeof getAPIConfigs>>,
  apiModules: RouteModule[],
  options: Options = {}
) => {
  const debug = (msg: string) => options.debug && process.stdout.write(msg)
  const debugMessages = apiConfigs.map(getDebugMessage)
  const maxLength = debugMessages.reduce((max, msg) => (msg.length > max ? msg.length : max), 0)

  for (let i = 0; i < apiConfigs.length; i++) {
    const { methodName, routePath } = apiConfigs[i]
    const module = apiModules[i]
    const msg = debugMessages[i]
    debug(debugPrefix + msg + ' '.repeat(maxLength - msg.length))
    const handlers: RequestHandler[] = []
    if (methodName === reqMethods[0]) {
      // Applying middleware
      handlers.push(...Object.values(module).flat().filter(isFunction).map(requestHandlerMapper))
      if (handlers.length) {
        router.use(routePath, ...handlers)
        debug(`   ${chalk.green('⇒ Succeeded!')}\n`)
      } else {
        debug(`   ${chalk.yellow(chalk.bold('⇒ No handling function'))}\n`)
      }
    } else {
      if (isFunction(module.default)) {
        if (typeof module.middleware === 'object') {
          handlers.push(
            ...Object.values(module.middleware).flat().filter(isFunction).map(requestHandlerMapper)
          )
        } else if (isFunction(module.middleware)) {
          handlers.push(requestHandlerMapper(module.middleware))
        }
        handlers.push(requestHandlerMapper(module.default))
      }
      if (handlers.length) {
        router[methodName](routePath, ...handlers)
        debug(`   ${chalk.green('⇒ Succeeded!')}\n`)
      } else {
        debug(`   ${chalk.yellow(chalk.bold('⇒ No handling function'))}\n`)
      }
    }
  }
  debug(debugPrefix + 'Initializing routes completed!\n')
}
