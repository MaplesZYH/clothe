export type GarmentQualityStatus = "usable" | "needs_cleanup" | "failed";
export type GarmentCategory = "top" | "bottom" | "outerwear" | "shoes" | "other";

export type GarmentProcessingInput = {
  sourceKey: string;
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png";
};

export type GarmentProcessingOutput = {
  sourceKey: string;
  status: GarmentQualityStatus;
  pngBytes?: Uint8Array;
  width?: number;
  height?: number;
  category?: GarmentCategory;
  primaryColor?: string;
  length?: string;
  segmentationConfidence: number;
  visualSimilarity: number;
  reason?: string;
};

export type GarmentProcessor = {
  process(input: GarmentProcessingInput): Promise<GarmentProcessingOutput>;
};

export function qualityGate(input: {
  segmentationConfidence: number;
  visualSimilarity: number;
}): GarmentQualityStatus {
  if (input.segmentationConfidence < 0.6 || input.visualSimilarity < 0.55) return "failed";
  if (input.segmentationConfidence < 0.85 || input.visualSimilarity < 0.75) return "needs_cleanup";
  return "usable";
}

export class StubGarmentProcessor implements GarmentProcessor {
  async process(input: GarmentProcessingInput): Promise<GarmentProcessingOutput> {
    return {
      sourceKey: input.sourceKey,
      status: "failed",
      segmentationConfidence: 0,
      visualSimilarity: 0,
      reason: "AI_PROVIDER_NOT_CONFIGURED"
    };
  }
}

export class HttpGarmentProcessor implements GarmentProcessor {
  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async process(input: GarmentProcessingInput): Promise<GarmentProcessingOutput> {
    const response = await this.fetcher(`${this.endpoint}/process`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": input.mimeType
      },
      body: input.bytes
    });
    if (!response.ok) throw new Error(`GARMENT_PROCESSOR_HTTP_${response.status}`);
    const output = await response.json() as Omit<GarmentProcessingOutput, "sourceKey" | "status">;
    return { ...output, sourceKey: input.sourceKey, status: qualityGate(output) };
  }
}

export function createConfiguredGarmentProcessor(env: {
  AI_PROVIDER?: string;
  AI_ENDPOINT?: string;
  AI_API_KEY?: string;
}): GarmentProcessor {
  if (env.AI_PROVIDER === "http") {
    if (!env.AI_ENDPOINT || !env.AI_API_KEY) {
      throw new Error("AI_ENDPOINT and AI_API_KEY are required for the http provider.");
    }
    return new HttpGarmentProcessor(env.AI_ENDPOINT, env.AI_API_KEY);
  }
  return new StubGarmentProcessor();
}
