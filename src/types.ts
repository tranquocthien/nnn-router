import {
  ErrorRequestHandler,
  NextFunction,
  ParamsDictionary,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express-serve-static-core'
import { ParsedQs } from 'qs'

export type JSExt = 'js' | 'cjs' | 'mjs' | 'ts'

export interface NnnRouter extends Router {
  /**
   * Get promise which resolved after all routes have been applied to the router
   */
  promise(): Promise<void>
}

export interface Options {
  /**
   * Propose relative path where contains route modules, default is `routes` directory inside current working directory
   * @default 'routes'
   */
  routeDir?: string
  /**
   * Absolute path of `routes` directory. If this exists, this will be overrided `routeDir` option
   */
  absolutePath?: string
  /**
   * @default express.Router()
   */
  baseRouter?: Router
  /**
   * Propose file module extensions to importing
   * @default ['js']
   */
  ext?: JSExt[]
  /**
   * Enable debug?
   * @default false
   */
  debug?: boolean
}

export interface AsyncRequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  LocalsObj extends Record<string, any> = Record<string, any>
> {
  (
    req: Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>,
    res: Response<ResBody, LocalsObj>,
    next: NextFunction
  ): Promise<any>
}

export interface AsyncErrorRequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  LocalsObj extends Record<string, any> = Record<string, any>
> {
  (
    err: any,
    req: Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>,
    res: Response<ResBody, LocalsObj>,
    next: NextFunction
  ): Promise<any>
}

export type RouteModule = Record<
  any,
  | AsyncRequestHandler[]
  | AsyncRequestHandler
  | RequestHandler[]
  | RequestHandler
  | ErrorRequestHandler[]
  | ErrorRequestHandler
  | AsyncErrorRequestHandler[]
  | AsyncErrorRequestHandler
>
