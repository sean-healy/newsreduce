module.exports = {
  testEnvironment: "node",
  "roots": [
    "<rootDir>/test"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  moduleDirectories: ['node_modules', 'src']
}
