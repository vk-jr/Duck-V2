import { logger } from "../logger";

if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error("REPLICATE_API_TOKEN is required");
}

const REPLICATE_BASE_URL = "https://api.replicate.com/v1";

interface RunModelParams {
  model: string; // e.g. "black-forest-labs/flux-1.1-pro"
  input: Record<string, unknown>;
}

// Replicate returns a prediction object with a URL output
// We poll until status is 'succeeded' or 'failed'
export async function runImageModel(params: RunModelParams): Promise<string> {
  // Create prediction
  const createResponse = await fetch(`${REPLICATE_BASE_URL}/models/${params.model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait=60", // Wait up to 60s before returning (reduces polling)
    },
    body: JSON.stringify({ input: params.input }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    logger.error("Replicate create prediction failed", {
      status: createResponse.status,
      model: params.model,
      error: errorText,
    });
    throw new Error(
      `Replicate returned ${createResponse.status}: ${errorText}`
    );
  }

  let prediction = await createResponse.json() as {
    id: string;
    status: string;
    output: string | string[] | null;
    error: string | null;
    urls?: { get: string };
  };

  // Poll if not yet complete (Prefer: wait may time out on slow models)
  const maxWaitMs = 5 * 60 * 1000; // 5 minutes max
  const pollIntervalMs = 2000;
  const startTime = Date.now();

  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled"
  ) {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(
        `Replicate prediction ${prediction.id} timed out after 5 minutes`
      );
    }

    await sleep(pollIntervalMs);

    const pollResponse = await fetch(
      `${REPLICATE_BASE_URL}/predictions/${prediction.id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        },
      }
    );

    if (!pollResponse.ok) {
      throw new Error(`Replicate poll returned ${pollResponse.status}`);
    }

    prediction = await pollResponse.json() as typeof prediction;
  }

  if (prediction.status === "failed" || prediction.status === "canceled") {
    throw new Error(
      `Replicate prediction ${prediction.status}: ${prediction.error ?? "unknown error"}`
    );
  }

  // Output is a URL string or array of URLs
  const output = prediction.output;
  if (!output) {
    throw new Error("Replicate returned no output");
  }

  // Return the URL string
  return Array.isArray(output) ? output[0] : output;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
