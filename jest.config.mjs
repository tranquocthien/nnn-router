/**@type {import('jest').Config} */
export default {
  transform: {
    '^.+\\.m?[jt]s$': 'babel-jest',
  },
  testEnvironment: 'jest-environment-node',
  testRegex: ['\\.test\\.ts$'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/index.ts',
    'src/helpers/apiConfigs.ts',
    'src/helpers/applyWaitingMiddlewareToRouter.ts',
  ],
}
