/**
 * composioCreateSession — server action.
 *
 * Thin shim around `container.composioClient.createSession`.
 * The action is admin-gated so only operators can spin up a
 * Composio tool-router session on behalf of an AMPH user.
 */

"use server";

import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";

export interface ComposioCreateSessionResponse {
  sessionId?: string;
  redirectUrl?: string;
  mcpUrl?: string;
  error?: string;
}

export async function composioCreateSessionAction(
  userId: string,
  toolkits?: readonly string[],
): Promise<ComposioCreateSessionResponse> {
  await requireAdmin();
  const container = buildContainer();

  const result = await container.composioClient.createSession(userId, {
    ...(toolkits ? { toolkits } : {}),
  });

  if (!result.ok) {
    return { error: result.error.kind };
  }

  return {
    sessionId: result.value.sessionId,
    redirectUrl: result.value.redirectUrl,
    mcpUrl: result.value.mcpUrl,
  };
}
