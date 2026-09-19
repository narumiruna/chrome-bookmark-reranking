import type { SystemOneResult } from "@typesafe-ai/sdk"
import { describe, expect, test, vi } from "vitest"
import {
  MAX_BOOKMARKS_PER_REQUEST,
  MAX_REQUEST_STATE_BYTES,
  type RerankClient,
  rerankBookmarks,
} from "../src/lib/rerank"

const candidates = [
  {
    id: "a",
    title: "React API",
    url: "https://react.dev/reference",
    path: "Engineering",
    dateAdded: 20,
  },
  {
    id: "b",
    title: "Practical form patterns",
    url: "https://example.com/forms",
    path: "Frontend",
    dateAdded: 10,
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
    expect(request.state.candidates).toHaveLength(candidates.length)
    expect(Object.keys(request.questions)).toEqual(["candidate_0", "candidate_1"])
    expect(request.questions.candidate_0.type).toBe("noul")
  })

  test("batches every bookmark into bounded Jev requests", async () => {
    const manyCandidates = Array.from({ length: MAX_BOOKMARKS_PER_REQUEST + 1 }, (_, index) => ({
      id: String(index),
      title: `Bookmark ${index}`,
      url: `https://example.com/${index}/${"x".repeat(5_000)}`,
      path: "Reference",
      dateAdded: index,
    }))
    const systemOne = vi.fn().mockImplementation((request) => {
      const state = request.state as { candidates: Array<{ title: string }> }
      return Promise.resolve({
        model: "jev-test",
        answers: Object.fromEntries(
          state.candidates.map((candidate, index) => [
            `candidate_${index}`,
            {
              type: "noul",
              noul: Number(candidate.title.split(" ")[1]) / manyCandidates.length,
            },
          ]),
        ),
        usage: { input_tokens: 100, output_tokens: state.candidates.length },
      })
    })
    const response = await rerankBookmarks(manyCandidates, "reference material", {
      systemOne,
    } as RerankClient)

    expect(systemOne.mock.calls.length).toBeGreaterThan(1)
    const sentCandidates = systemOne.mock.calls.flatMap(([request]) => {
      const state = request.state as { candidates: Array<{ title: string }> }
      expect(state.candidates.length).toBeLessThanOrEqual(MAX_BOOKMARKS_PER_REQUEST)
      expect(
        new TextEncoder().encode(JSON.stringify(request.state)).byteLength,
      ).toBeLessThanOrEqual(MAX_REQUEST_STATE_BYTES)
      return state.candidates
    })
    expect(sentCandidates.map((candidate) => candidate.title)).toEqual(
      manyCandidates.map((candidate) => candidate.title),
    )
    expect(response.results).toHaveLength(manyCandidates.length)
    expect(response.results[0].id).toBe(String(manyCandidates.length - 1))
    expect(response.inputTokens).toBe(systemOne.mock.calls.length * 100)
    expect(response.outputTokens).toBe(manyCandidates.length)
  })

  test("does not call TypeSafe when there are no candidates", async () => {
    const systemOne = vi.fn()
    const response = await rerankBookmarks([], "anything", { systemOne } as RerankClient)

    expect(systemOne).not.toHaveBeenCalled()
    expect(response.results).toEqual([])
  })
})
