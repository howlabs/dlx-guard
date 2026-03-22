/**
 * npx command - Run npx with security check
 * Following gstack pattern: use shared executor to eliminate duplication
 */

import type { CommandHandler } from "../types.ts";
import { createSecurityWrappedHandler, EXECUTORS } from "./shared-executor.ts";

export const npxCommand: CommandHandler = createSecurityWrappedHandler(EXECUTORS.npx);
