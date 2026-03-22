/**
 * pnpm dlx command - Run pnpm dlx with security check
 * Following gstack pattern: use shared executor to eliminate duplication
 */

import type { CommandHandler } from "../types.ts";
import { createSecurityWrappedHandler, EXECUTORS } from "./shared-executor.ts";

export const pnpmDlxCommand: CommandHandler = createSecurityWrappedHandler(EXECUTORS["pnpm-dlx"]);
