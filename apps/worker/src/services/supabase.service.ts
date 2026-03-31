import { createClient } from "@supabase/supabase-js";
import { logger } from "../logger";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

// Worker always uses service role key to bypass RLS
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ── logWorkflow ───────────────────────────────────────────────
// Called at start and end of every job to maintain audit trail

interface LogWorkflowParams {
  workflowName: string;
  entityId: string;
  entityType: string;
  userId?: string;
  status: "started" | "completed" | "failed";
  duration_ms?: number;
  error?: object;
  metadata?: object;
}

export async function logWorkflow(params: LogWorkflowParams): Promise<void> {
  try {
    const { error } = await supabase.from("workflow_logs").insert({
      workflow_name: params.workflowName,
      entity_id: params.entityId,
      entity_type: params.entityType,
      user_id: params.userId ?? null,
      status: params.status,
      duration_ms: params.duration_ms ?? null,
      error: params.error ? params.error : null,
      metadata: params.metadata ?? null,
    });

    if (error) {
      // Cannot write to DB if DB is failing — log to console only
      logger.error("Failed to write workflow log", {
        supabaseError: error.message,
        params,
      });
    }
  } catch (err) {
    logger.error("logWorkflow threw an exception", { err, params });
  }
}
