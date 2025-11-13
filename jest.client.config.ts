import nextJest from "next/jest.js";
import type { Config } from "jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  projects: [
    {
      displayName: "client",
      testEnvironment: "jsdom",
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      testMatch: [
        "<rootDir>/src/**/*.test.@(js|ts|tsx)",
        "<rootDir>/app/**/*.client.test.@(js|ts|tsx)"
      ],
    },
    {
      displayName: "server",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/app/api/**/*.test.@(js|ts)",
        "<rootDir>/lib/**/*.test.@(js|ts)"
      ],
    },
  ],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  
};

export default createJestConfig(config);