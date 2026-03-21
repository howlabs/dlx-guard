/**
 * Typosquatting detection
 * Following gstack pattern: security-focused, well-tested utility
 *
 * Typosquatting là kỹ thuật attacker tạo package tên giống package nổi tiếng
 * nhưng có lỗi chính tả nhỏ để lỡ user cài nhầm.
 */

/**
 * Tính Levenshtein distance giữa 2 strings
 * Số càng nhỏ thì càng giống nhau
 */
export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * List của popular npm packages
 * Đây là target thường bị typosquatting
 */
const POPULAR_PACKAGES = [
  // CLI tools
  "npm",
  "npx",
  "yarn",
  "pnpm",
  "bun",
  "bunx",
  "node",
  "nvm",

  // Frontend frameworks
  "react",
  "vue",
  "angular",
  "svelte",
  "solid-js",
  "preact",
  "next",
  "nuxt",
  "remix",

  // Build tools
  "vite",
  "webpack",
  "rollup",
  "esbuild",
  "parcel",
  "turbo",
  "babel",
  "typescript",
  "ts-node",

  // Testing
  "jest",
  "vitest",
  "mocha",
  "jasmine",
  "cypress",
  "playwright",
  "puppeteer",

  // Libraries
  "lodash",
  "axios",
  "express",
  "koa",
  "fastify",
  "moment",
  "dayjs",
  "date-fns",

  // Utilities
  "chalk",
  "ora",
  "inquirer",
  "commander",
  "yargs",
  "minimist",
  "dotenv",
  "eslint",
  "prettier",

  // React ecosystem
  "redux",
  "mobx",
  "zustand",
  "recoil",
  "jotai",
  "react-router",
  "react-query",

  // Vue ecosystem
  "vuex",
  "pinia",
  "vue-router",

  // Node.js utilities
  "fs-extra",
  "glob",
  "rimraf",
  "mkdirp",
  "cross-env",
  "nodemon",
  "pm2",

  // Popular CLIs
  "create-react-app",
  "create-vite",
  "create-next-app",
  "scaffold",
  "yeoman",
  "generator",
];

/**
 * Check if package name có thể là typosquatting attempt
 *
 * @param packageName - Package name cần check
 * @returns Object với isTyposquat và similarPackage nếu tìm thấy
 */
export interface TyposquatResult {
  isTyposquat: boolean;
  similarPackage?: string;
  distance?: number;
}

export function checkTyposquat(packageName: string): TyposquatResult {
  const name = packageName.toLowerCase().replace(/^@[^/]+\//, ""); // Remove scope

  // Skip nếu package name quá ngắn
  if (name.length < 3) {
    return { isTyposquat: false };
  }

  // Skip nếu package đã tồn tại trong popular list
  if (POPULAR_PACKAGES.includes(name)) {
    return { isTyposquat: false };
  }

  // Check distance với mỗi popular package
  for (const popular of POPULAR_PACKAGES) {
    // Chỉ check nếu popular package có độ dài tương đối
    if (popular.length < 5) continue;

    const distance = levenshtein(name, popular);

    // Distance <= 2 cho package dài > 5 chars là nghi ngờ
    // Distance = 1 cho package ngắn hơn cũng nghi ngờ
    const isClose =
      (popular.length > 5 && distance <= 2) ||
      (popular.length <= 5 && distance === 1);

    if (isClose) {
      return {
        isTyposquat: true,
        similarPackage: popular,
        distance,
      };
    }
  }

  // Check các pattern typosquatting phổ biến
  const typosquatPatterns = [
    /^([a-z]+)-([a-z]+)\1$/, // Double prefix like "react-react"
    /^([a-z]+)\1$/, // Double name like "reactreact"
  ];

  for (const pattern of typosquatPatterns) {
    if (pattern.test(name)) {
      return {
        isTyposquat: true,
        similarPackage: "suspicious pattern",
        distance: 0,
      };
    }
  }

  return { isTyposquat: false };
}

/**
 * Lấy danh sách popular packages (để testing/config)
 */
export function getPopularPackages(): string[] {
  return [...POPULAR_PACKAGES];
}
