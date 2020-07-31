module.exports = {
  testEnvironment: "node",
  "roots": [
    "<rootDir>/src/test"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  moduleDirectories: ["node_modules", "src/main/ts"],
  "collectCoverageFrom": [
    "**/*.ts"
  ],
  setupFiles: ["<rootDir>/.jest/setEnvVars.js"]
}
