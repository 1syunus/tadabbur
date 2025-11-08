import type {Config} from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({
    dir: "./",
})

const config: Config = {
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    coverageProvider: "v8",
    moduleNameMapper: {
        "\\.(css|scss|sass)$": "identity-obj-proxy",
        "^@/(.*)$": "<rootDir>/$1",
    },
    testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
}

export default createJestConfig(config)