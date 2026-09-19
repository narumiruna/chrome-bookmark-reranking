import type { SystemOneResult } from "@typesafe-ai/sdk"
import { describe, expect, test, vi } from "vitest"
import { type RerankClient, rerankBookmarks } from "../src/lib/rerank"

const candidates = [
  {
    id: "a",
    title: "React API",
    url: "https://react.dev/reference",
    path: "Engineering",
    dateAdded: 20,
    localScore: 100,
  },
  {
    id: "b",
    title: "Practical form patterns",
    url: "https://example.com/forms",
    path: "Frontend",
    dateAdded: 10,
    localScore: 60,
  },
]

describe("rerankBookmarks", () => {
  test("uses comparable Noul probabilities to reorder candidates", async () => {
    const systemOne = vi.fn().mockResolvedValue({
      model: "jev-test",
      answers: {
        candidate_0: { type: "noul", noul: 0.23 },
        candidate_1: { type: "noul", noul: 0.91 },
      },
      usage: { input_tokens: 120, output_tokens: 8 },
    } satisfies SystemOneResult<Record<string, { type: "noul" }>>)
    const client = { systemOne } as RerankClient

    const response = await rerankBookmarks(candidates, "help me build a less fragile form", client)

    expect(response.results.map((result) => result.id)).toEqual(["b", "a"])
    expect(response.results[0].relevance).toBe(0.91)
    expect(response.model).toBe("jev-test")
    expect(response.inputTokens).toBe(120)

    const request = systemOne.mock.calls[0][0]
    expect(request.state.searchIntent).toBe("help me build a less fragile form")
    expect(Object.keys(request.questions)).toEqual(["candidate_0", "candidate_1"])
    expect(request.questions.candidate_0.type).toBe("noul")
  })

  test("does not call TypeSafe when there are no candidates", async () => {
    const systemOne = vi.fn()
    const response = await rerankBookmarks([], "anything", { systemOne } as RerankClient)

    expect(systemOne).not.toHaveBeenCalled()
    expect(response.results).toEqual([])
  })
})
