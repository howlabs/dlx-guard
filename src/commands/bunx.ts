/**
 * bunx command - Run bunx with security check
 * Following gstack pattern: use shared executor to eliminate duplication
 */

import type { CommandHandler } from "../types.ts";
import { createSecurityWrappedHandler, EXECUTORS } from "./shared-executor.ts";

export const bunxCommand: CommandHandler = createSecurityWrappedHandler(EXECUTORS.bunx);
