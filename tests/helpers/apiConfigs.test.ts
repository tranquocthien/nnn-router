import { reqMethods } from '../../src/constants'
import {
  applyAPIConfigsToRouter,
  getAPIConfigs,
  parseMethodAndRoutePathFromFilePath,
  resolveModulesFromAPIConfigs,
} from '../../src/helpers/apiConfigs'
import { RouteModule } from '../../src/types'

describe('Test function parseMethodAndRoutePathFromFilePath', () => {
  describe('Test parsing methodName', () => {
    reqMethods.forEach((methodName) => {
      it(methodName, () => {
        expect(parseMethodAndRoutePathFromFilePath(`${methodName}.js`)).toMatchObject({
          methodName,
        })
        expect(parseMethodAndRoutePathFromFilePath(`abc/xyz/${methodName}.js`)).toMatchObject({
          methodName,
        })
      })
    })
    it('Invalid method', () => {
      expect(parseMethodAndRoutePathFromFilePath('invalid.js')).toBeNull()
      expect(parseMethodAndRoutePathFromFilePath('invalid')).toBeNull()
      expect(parseMethodAndRoutePathFromFilePath('')).toBeNull()
      expect(parseMethodAndRoutePathFromFilePath('abc/xyz/invalid.js')).toBeNull()
    })
  })

  describe('Test parsing routePath', () => {
    it('root route', () => {
      expect(parseMethodAndRoutePathFromFilePath('get.js')).toMatchObject({
        routePath: '/',
      })
    })
    it('sub route with static path', () => {
      expect(parseMethodAndRoutePathFromFilePath('abc/xyz/get.js')).toMatchObject({
        routePath: '/abc/xyz',
      })
      expect(parseMethodAndRoutePathFromFilePath('abc/x_yz/get.js')).toMatchObject({
        routePath: '/abc/x_yz',
      })
    })
    it('sub route with dynamic path', () => {
      expect(parseMethodAndRoutePathFromFilePath('abc/_xyz/get.js')).toMatchObject({
        routePath: '/abc/:xyz',
      })
      expect(parseMethodAndRoutePathFromFilePath('abc/_xyz/abc/_def/get.js')).toMatchObject({
        routePath: '/abc/:xyz/abc/:def',
      })
    })
  })

  it('should return relativeFilePath in returned object', () => {
    const relativeFilePath = 'abc/xyz/get.js'
    expect(parseMethodAndRoutePathFromFilePath(relativeFilePath)).toMatchObject({
      relativeFilePath,
    })
  })
})

describe('Test function getAPIConfigs', () => {
  test('should place middleware on top', () => {
    const relativeFilePaths = [
      'users/_userId/books/_bookId/get.js',
      'users/_userId/get.js',
      'users/middleware.js',
      'users/trace.js',
      'users/_userId/middleware.js',
    ]
    const expectedSortedConfigs = [
      {
        methodName: 'middleware',
        routePath: '/users',
        relativeFilePath: 'users/middleware.js',
      },
      {
        methodName: 'middleware',
        routePath: '/users/:userId',
        relativeFilePath: 'users/_userId/middleware.js',
      },
      {
        methodName: 'get',
        routePath: '/users/:userId/books/:bookId',
        relativeFilePath: 'users/_userId/books/_bookId/get.js',
      },
      {
        methodName: 'get',
        routePath: '/users/:userId',
        relativeFilePath: 'users/_userId/get.js',
      },
      {
        methodName: 'trace',
        routePath: '/users',
        relativeFilePath: 'users/trace.js',
      },
    ]
    const sortedConfigs = getAPIConfigs(relativeFilePaths)
    expect(sortedConfigs).toEqual(expectedSortedConfigs)
  })

  test('should place static route path on top', () => {
    const relativeFilePaths = [
      'users/_userId/books/_bookId/get.js',
      'users/_userId/books/count/get.js',
    ]
    const sortedConfigs = getAPIConfigs(relativeFilePaths)
    expect(sortedConfigs).toEqual([
      {
        methodName: 'get',
        relativeFilePath: 'users/_userId/books/count/get.js',
        routePath: '/users/:userId/books/count',
      },
      {
        methodName: 'get',
        relativeFilePath: 'users/_userId/books/_bookId/get.js',
        routePath: '/users/:userId/books/:bookId',
      },
    ])
  })

  test('should sort by reqMethods', () => {
    const relativeFilePaths = reqMethods.map((methodName) => `users/${methodName}.js`).sort()
    const sortedConfigs = getAPIConfigs(relativeFilePaths)
    sortedConfigs.forEach((config, index) => {
      expect(config!.methodName).toEqual(reqMethods[index])
    })
  })

  test('should filter out invalid API configs', () => {
    const relativeFilePaths = ['books/_bookId/authors/invalid.js']
    const sortedConfigs = getAPIConfigs(relativeFilePaths)
    expect(sortedConfigs).toHaveLength(0)
  })

  test('should return an empty array when relativeFilePaths is empty', () => {
    const relativeFilePaths = []
    const sortedConfigs = getAPIConfigs(relativeFilePaths)
    expect(sortedConfigs).toHaveLength(0)
  })
})

/* describe('Test function resolveModulesFromAPIConfigs', () => {
  const absoluteRouteDir = process.cwd() + 'tests/routes'
  test('should return an array of imported modules', async () => {
    const relativeFilePaths = [
      'get.js',
      '_id/get.js',
      'books/get.js',
      'books/trace.js',
    ]
    const modules: any[] = []
    for (const relativeFilePath of relativeFilePaths) {
      const absoluteFilePath = path.join(absoluteRouteDir, relativeFilePath)
      const module = await import(absoluteFilePath)
      modules.push(module)
    }
    const result = await resolveModulesFromAPIConfigs(relativeFilePaths, absoluteRouteDir)
    expect(result).toEqual(modules)
  })
  test('should return an empty array when relativeFilePaths is empty', async () => {
    const relativeFilePaths = []
    const result = await resolveModulesFromAPIConfigs(relativeFilePaths, absoluteRouteDir)
    expect(result).toEqual([])
  })
}) */

describe('applyAPIConfigsToRouter', () => {
  let routerMock: any
  let apiModules: RouteModule[], apiConfigs: Array<any>
  beforeEach(async () => {
    routerMock = jest.fn()
    reqMethods.forEach((method: string) => {
      if (method === reqMethods[0]) method = 'use'
      routerMock[method] = jest.fn().mockReturnThis()
    })
  })
  afterEach(() => {
    jest.clearAllMocks()
  })
  describe('Test applying middleware', () => {
    test('should apply middleware when module has some exports', () => {
      apiConfigs = [
        {
          methodName: 'middleware',
          routePath: '/categories',
          relativeFilePath: 'categories/middleware.js',
        },
      ]
      apiModules = [
        {
          m1: function () {},
          m2: [function () {}, function () {}, 'this is not a function' as any],
        },
      ]
      applyAPIConfigsToRouter(routerMock, apiConfigs, apiModules)
      expect(routerMock.use).toHaveBeenCalledWith(
        apiConfigs[0].routePath,
        ...Object.values(apiModules[0])
          .flat()
          .filter((func) => typeof func === 'function')
      )
    })
    test('should not apply middleware when module does not have any export', () => {
      apiConfigs = [
        {
          methodName: 'middleware',
          routePath: '/admin',
          relativeFilePath: 'admin/middleware.js',
        },
      ]
      apiModules = [{}]
      applyAPIConfigsToRouter(routerMock, apiConfigs, apiModules)
      expect(routerMock.use).toHaveBeenCalledTimes(0)
    })
    test('should not apply middleware when module has no export function', () => {
      apiConfigs = [
        {
          methodName: 'middleware',
          routePath: '/admin',
          relativeFilePath: 'admin/middleware.js',
        },
      ]
      apiModules = [
        {
          m1: 1,
          m2: 'abc',
        },
      ] as any[]
      applyAPIConfigsToRouter(routerMock, apiConfigs, apiModules)
      expect(routerMock.use).toHaveBeenCalledTimes(0)
    })
  })
  describe('Test applying specified method', () => {
    test('should apply specified method when module has default export', () => {
      apiConfigs = [
        {
          methodName: 'trace',
          routePath: '/tests/routes/books',
          relativeFilePath: 'tests/routes/books/trace.js',
        },
        {
          methodName: 'get',
          routePath: '/tests/routes/users/:id',
          relativeFilePath: 'tests/routes/users/_id/get.js',
        },
        {
          methodName: 'post',
          routePath: '/users',
          relativeFilePath: 'users/post.js',
        },
      ]
      apiModules = [
        {
          default: function () {},
          middleware: function () {},
        },
        {
          default: function () {},
          middleware: [function () {}, function () {}, 'this is not a function' as any],
        },
        {
          default: function () {},
        },
      ]
      const getHandlerFromModule = (obj: any) => {
        const handlers = [] as any[]
        const { default: defaultHandler, middleware } = obj
        if (Array.isArray(middleware))
          handlers.push(...middleware.filter((func) => typeof func === 'function'))
        else if (typeof middleware === 'function') handlers.push(middleware)
        if (typeof defaultHandler === 'function') handlers.push(defaultHandler)
        return handlers
      }
      applyAPIConfigsToRouter(routerMock, apiConfigs, apiModules)
      for (let i = 0; i < apiConfigs.length; i++) {
        const { methodName, routePath } = apiConfigs[i]
        expect(routerMock[methodName]).toHaveBeenCalledWith(
          routePath,
          ...getHandlerFromModule(apiModules[i])
        )
      }
    })
    test('should not apply specified method when module does not have default export', () => {
      apiConfigs = [
        {
          methodName: 'delete',
          routePath: '/users',
          relativeFilePath: 'users/delete.js',
        },
      ]
      apiModules = [
        {
          middleware: function () {},
        },
      ]
      applyAPIConfigsToRouter(routerMock, apiConfigs, apiModules)
      expect(routerMock.delete).toHaveBeenCalledTimes(0)
    })
    test('should not apply specified method when module has no export function', () => {
      apiConfigs = [
        {
          methodName: 'delete',
          routePath: '/users',
          relativeFilePath: 'users/delete.js',
        },
      ]
      apiModules = [
        {
          default: 1,
          middleware: 'abc',
        },
      ] as any[]
      applyAPIConfigsToRouter(routerMock, apiConfigs, apiModules)
      expect(routerMock.delete).toHaveBeenCalledTimes(0)
    })
  })
})
