import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Mock the `ai` module so we never hit real API endpoints
vi.mock("ai", () => ({
  embed: vi.fn(),
  embedMany: vi.fn(),
}));

import { embed, embedMany } from "ai";
import {
  cosineSimilarity,
  contentHash,
  hasEmbeddingSupport,
  getEmbeddingModelName,
  getEmbeddingModel,
  loadVectorStore,
  saveVectorStore,
  upsertEmbedding,
  removeEmbedding,
  searchByVector,
  embedText,
  embedTexts,
  type VectorStore,
} from "../embeddings";

// ---------------------------------------------------------------------------
// Env var save/restore — keep tests isolated
// ---------------------------------------------------------------------------

const ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
  "EMBEDDING_MODEL",
  "WIKI_DIR",
] as const;

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  vi.clearAllMocks();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

// Cast for convenience
const mockEmbed = embed as ReturnType<typeof vi.fn>;
const mockEmbedMany = embedMany as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// cosineSimilarity — pure math
// ---------------------------------------------------------------------------

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 10);
  });

  it("returns 0.0 for orthogonal vectors", () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 10);
  });

  it("returns -1.0 for opposite vectors", () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 10);
  });

  it("handles zero vectors gracefully", () => {
    const zero = [0, 0, 0];
    const v = [1, 2, 3];
    expect(cosineSimilarity(zero, v)).toBe(0);
    expect(cosineSimilarity(v, zero)).toBe(0);
    expect(cosineSimilarity(zero, zero)).toBe(0);
  });

  it("throws on dimension mismatch", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
      /dimension mismatch/i,
    );
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("computes correctly for non-unit vectors", () => {
    // cos(45°) ≈ 0.7071
    const a = [1, 0];
    const b = [1, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1 / Math.sqrt(2), 5);
  });
});

// ---------------------------------------------------------------------------
// hasEmbeddingSupport / getEmbeddingModelName
// ---------------------------------------------------------------------------

describe("hasEmbeddingSupport", () => {
  it("returns false when no keys configured", () => {
    expect(hasEmbeddingSupport()).toBe(false);
  });

  it("returns false when only Anthropic key is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(hasEmbeddingSupport()).toBe(false);
  });

  it("returns true when OpenAI key is set", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(hasEmbeddingSupport()).toBe(true);
  });

  it("returns true when Google key is set", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-test";
    expect(hasEmbeddingSupport()).toBe(true);
  });

  it("returns true when Ollama is configured", () => {
    process.env.OLLAMA_BASE_URL = "http://localhost:11434/api";
    expect(hasEmbeddingSupport()).toBe(true);
  });

  it("returns true when OLLAMA_MODEL is set", () => {
    process.env.OLLAMA_MODEL = "llama3.2";
    expect(hasEmbeddingSupport()).toBe(true);
  });
});

describe("getEmbeddingModelName", () => {
  it("returns null when no provider configured", () => {
    expect(getEmbeddingModelName()).toBeNull();
  });

  it("returns null when only Anthropic is configured", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(getEmbeddingModelName()).toBeNull();
  });

  it("returns OpenAI default model", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(getEmbeddingModelName()).toBe("text-embedding-3-small");
  });

  it("returns Google default model", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-test";
    expect(getEmbeddingModelName()).toBe("gemini-embedding-001");
  });

  it("returns Ollama default model", () => {
    process.env.OLLAMA_BASE_URL = "http://localhost:11434/api";
    expect(getEmbeddingModelName()).toBe("nomic-embed-text");
  });

  it("respects EMBEDDING_MODEL override", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.EMBEDDING_MODEL = "text-embedding-3-large";
    expect(getEmbeddingModelName()).toBe("text-embedding-3-large");
  });

  it("prefers OpenAI over Google when both present", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-test";
    expect(getEmbeddingModelName()).toBe("text-embedding-3-small");
  });
});

// ---------------------------------------------------------------------------
// embedText / embedTexts — return null when no provider
// ---------------------------------------------------------------------------

describe("embedText / embedTexts without provider", () => {
  it("embedText returns null when no provider is configured", async () => {
    expect(await embedText("hello")).toBeNull();
  });

  it("embedTexts returns null when no provider is configured", async () => {
    expect(await embedTexts(["hello", "world"])).toBeNull();
  });
});

describe("embedText / embedTexts with mocked provider", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test";
  });

  it("embedText returns the embedding from the AI SDK", async () => {
    mockEmbed.mockResolvedValue({ embedding: [0.1, 0.2, 0.3] });

    const result = await embedText("hello");
    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(mockEmbed).toHaveBeenCalledOnce();
  });

  it("embedTexts returns embeddings from the AI SDK", async () => {
    mockEmbedMany.mockResolvedValue({
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    });

    const result = await embedTexts(["hello", "world"]);
    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    expect(mockEmbedMany).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Vector store persistence — round-trip to tmp dir
// ---------------------------------------------------------------------------

describe("vector store persistence", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "embeddings-test-"));
    process.env.WIKI_DIR = tmpDir;
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("loadVectorStore returns null when no file exists", async () => {
    expect(await loadVectorStore()).toBeNull();
  });

  it("round-trips a vector store to disk", async () => {
    const store: VectorStore = {
      model: "text-embedding-3-small",
      entries: [
        {
          slug: "test-page",
          embedding: [0.1, 0.2, 0.3],
          contentHash: "abc123",
        },
        {
          slug: "another-page",
          embedding: [0.4, 0.5, 0.6],
          contentHash: "def456",
        },
      ],
    };

    await saveVectorStore(store);
    const loaded = await loadVectorStore();

    expect(loaded).not.toBeNull();
    expect(loaded!.model).toBe("text-embedding-3-small");
    expect(loaded!.entries).toHaveLength(2);
    expect(loaded!.entries[0].slug).toBe("test-page");
    expect(loaded!.entries[0].embedding).toEqual([0.1, 0.2, 0.3]);
    expect(loaded!.entries[1].slug).toBe("another-page");
  });

  it("saveVectorStore creates the wiki directory if needed", async () => {
    const nestedDir = path.join(tmpDir, "nested", "wiki");
    process.env.WIKI_DIR = nestedDir;

    const store: VectorStore = {
      model: "test-model",
      entries: [],
    };

    await saveVectorStore(store);
    const loaded = await loadVectorStore();
    expect(loaded).not.toBeNull();
    expect(loaded!.model).toBe("test-model");
  });
});

// ---------------------------------------------------------------------------
// removeEmbedding
// ---------------------------------------------------------------------------

describe("removeEmbedding", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "embeddings-test-"));
    process.env.WIKI_DIR = tmpDir;
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("removes the correct slug from the store", async () => {
    const store: VectorStore = {
      model: "test-model",
      entries: [
        { slug: "keep-me", embedding: [1, 0], contentHash: "a" },
        { slug: "remove-me", embedding: [0, 1], contentHash: "b" },
        { slug: "also-keep", embedding: [1, 1], contentHash: "c" },
      ],
    };
    await saveVectorStore(store);

    await removeEmbedding("remove-me");

    const loaded = await loadVectorStore();
    expect(loaded!.entries).toHaveLength(2);
    expect(loaded!.entries.map((e) => e.slug)).toEqual([
      "keep-me",
      "also-keep",
    ]);
  });

  it("does nothing if the slug is not in the store", async () => {
    const store: VectorStore = {
      model: "test-model",
      entries: [{ slug: "existing", embedding: [1, 0], contentHash: "a" }],
    };
    await saveVectorStore(store);

    await removeEmbedding("nonexistent");

    const loaded = await loadVectorStore();
    expect(loaded!.entries).toHaveLength(1);
  });

  it("does nothing if the store does not exist", async () => {
    // Should not throw
    await removeEmbedding("whatever");
  });
});

// ---------------------------------------------------------------------------
// upsertEmbedding — with mocked embed function
// ---------------------------------------------------------------------------

describe("upsertEmbedding", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "embeddings-test-"));
    process.env.WIKI_DIR = tmpDir;
    process.env.OPENAI_API_KEY = "sk-test-key";
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("skips re-embedding when contentHash matches", async () => {
    const content = "hello world";
    const hash = contentHash(content);

    // Pre-seed the store with a matching hash
    const store: VectorStore = {
      model: "text-embedding-3-small",
      entries: [
        { slug: "test-page", embedding: [0.1, 0.2], contentHash: hash },
      ],
    };
    await saveVectorStore(store);

    await upsertEmbedding("test-page", content);

    // embed should NOT have been called since hash matches
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("clears all entries when model changes", async () => {
    // Store was created with a different model
    const store: VectorStore = {
      model: "old-model-v1",
      entries: [
        { slug: "page-a", embedding: [1, 0], contentHash: "aaa" },
        { slug: "page-b", embedding: [0, 1], contentHash: "bbb" },
      ],
    };
    await saveVectorStore(store);

    // Mock the AI SDK embed function
    mockEmbed.mockResolvedValue({ embedding: [0.5, 0.5] });

    await upsertEmbedding("new-page", "new content");

    const loaded = await loadVectorStore();
    expect(loaded!.model).toBe("text-embedding-3-small"); // current model
    // Old entries should be gone, only the new one remains
    expect(loaded!.entries).toHaveLength(1);
    expect(loaded!.entries[0].slug).toBe("new-page");
  });

  it("adds a new entry when slug is not in store", async () => {
    const store: VectorStore = {
      model: "text-embedding-3-small",
      entries: [
        { slug: "existing", embedding: [1, 0], contentHash: "aaa" },
      ],
    };
    await saveVectorStore(store);

    mockEmbed.mockResolvedValue({ embedding: [0.3, 0.7] });

    await upsertEmbedding("new-page", "some content");

    const loaded = await loadVectorStore();
    expect(loaded!.entries).toHaveLength(2);
    expect(loaded!.entries[1].slug).toBe("new-page");
    expect(loaded!.entries[1].embedding).toEqual([0.3, 0.7]);
  });

  it("updates an existing entry when content changes", async () => {
    const store: VectorStore = {
      model: "text-embedding-3-small",
      entries: [
        { slug: "my-page", embedding: [1, 0], contentHash: "old-hash" },
      ],
    };
    await saveVectorStore(store);

    mockEmbed.mockResolvedValue({ embedding: [0.9, 0.1] });

    await upsertEmbedding("my-page", "updated content");

    const loaded = await loadVectorStore();
    expect(loaded!.entries).toHaveLength(1);
    expect(loaded!.entries[0].slug).toBe("my-page");
    expect(loaded!.entries[0].embedding).toEqual([0.9, 0.1]);
    expect(loaded!.entries[0].contentHash).toBe(contentHash("updated content"));
  });

  it("does nothing when no embedding provider is available", async () => {
    delete process.env.OPENAI_API_KEY;

    // Should not throw and should not create a store
    await upsertEmbedding("test", "content");

    const loaded = await loadVectorStore();
    expect(loaded).toBeNull();
    expect(mockEmbed).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// searchByVector — with pre-loaded store
// ---------------------------------------------------------------------------

describe("searchByVector", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "embeddings-test-"));
    process.env.WIKI_DIR = tmpDir;
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns empty array when no embedding support", async () => {
    // No provider keys set
    const results = await searchByVector("query", 5);
    expect(results).toEqual([]);
  });

  it("returns correct ranking order", async () => {
    // Pre-load a store with known embeddings
    const store: VectorStore = {
      model: "text-embedding-3-small",
      entries: [
        { slug: "low-match", embedding: [0, 1, 0], contentHash: "a" },
        { slug: "high-match", embedding: [1, 0, 0], contentHash: "b" },
        { slug: "mid-match", embedding: [0.7, 0.7, 0], contentHash: "c" },
      ],
    };
    await saveVectorStore(store);

    process.env.OPENAI_API_KEY = "sk-test";

    // Mock embed to return a query vector closest to high-match
    mockEmbed.mockResolvedValue({ embedding: [1, 0, 0] });

    const results = await searchByVector("test query", 10);

    expect(results).toHaveLength(3);
    expect(results[0].slug).toBe("high-match");
    expect(results[0].score).toBeCloseTo(1.0, 5);
    expect(results[1].slug).toBe("mid-match");
    expect(results[2].slug).toBe("low-match");
    expect(results[2].score).toBeCloseTo(0.0, 5);
  });

  it("respects topK limit", async () => {
    const store: VectorStore = {
      model: "text-embedding-3-small",
      entries: [
        { slug: "a", embedding: [1, 0], contentHash: "a" },
        { slug: "b", embedding: [0.9, 0.1], contentHash: "b" },
        { slug: "c", embedding: [0.5, 0.5], contentHash: "c" },
      ],
    };
    await saveVectorStore(store);

    process.env.OPENAI_API_KEY = "sk-test";
    mockEmbed.mockResolvedValue({ embedding: [1, 0] });

    const results = await searchByVector("test", 2);
    expect(results).toHaveLength(2);
  });

  it("returns empty array when store is empty", async () => {
    const store: VectorStore = {
      model: "text-embedding-3-small",
      entries: [],
    };
    await saveVectorStore(store);

    process.env.OPENAI_API_KEY = "sk-test";
    mockEmbed.mockResolvedValue({ embedding: [1, 0] });

    const results = await searchByVector("test", 5);
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// contentHash utility
// ---------------------------------------------------------------------------

describe("contentHash", () => {
  it("returns consistent hash for same content", () => {
    const h1 = contentHash("hello");
    const h2 = contentHash("hello");
    expect(h1).toBe(h2);
  });

  it("returns different hash for different content", () => {
    const h1 = contentHash("hello");
    const h2 = contentHash("world");
    expect(h1).not.toBe(h2);
  });

  it("returns a 32-char hex string (MD5)", () => {
    const h = contentHash("test");
    expect(h).toMatch(/^[a-f0-9]{32}$/);
  });
});

// ---------------------------------------------------------------------------
// getEmbeddingModel — basic checks (no real API calls)
// ---------------------------------------------------------------------------

describe("getEmbeddingModel", () => {
  it("returns null when no provider configured", () => {
    expect(getEmbeddingModel()).toBeNull();
  });

  it("returns null when only Anthropic is configured", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(getEmbeddingModel()).toBeNull();
  });

  it("returns a model object when OpenAI is configured", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const model = getEmbeddingModel();
    expect(model).not.toBeNull();
  });

  it("returns a model object when Google is configured", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-test";
    const model = getEmbeddingModel();
    expect(model).not.toBeNull();
  });

  it("returns a model object when Ollama is configured", () => {
    process.env.OLLAMA_BASE_URL = "http://localhost:11434/api";
    const model = getEmbeddingModel();
    expect(model).not.toBeNull();
  });
});
