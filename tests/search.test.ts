import type { SystemOneResult } from "@typesafe-ai/sdk"
import { describe, expect, test, vi } from "vitest"
import type { RerankClient } from "../src/lib/rerank"
import { type SearchDependencies, searchBookmarks } from "../src/lib/search"

const tree: chrome.bookmarks.BookmarkTreeNode[] = [
  {
    id: "root",
    title: "",
    syncing: false,
    children: [
      {
        id: "a",
        title: "React API",
        syncing: false,
        url: "https://react.dev/reference",
      },
      {
        id: "b",
        title: "TypeSafe docs",
        syncing: false,
        url: "https://docs.typesafe.ai",
      },
    ],
  },
]

describe("searchBookmarks", () => {
  test("sends every bookmark to Jev in one request", async () => {
    const systemOne = vi.fn().mockResolvedValue({
      model: "jev-test",
      answers: {
        candidate_0: { type: "noul", noul: 0.2 },
        candidate_1: { type: "noul", noul: 0.9 },
      },
      usage: { input_tokens: 80, output_tokens: 4 },
    } satisfies SystemOneResult<Record<string, { type: "noul" }>>)
    const dependencies: SearchDependencies = {
      getBookmarkTree: vi.fn().mockResolvedValue(tree),
      createClient: vi.fn().mockReturnValue({ systemOne } as RerankClient),
    }

    const response = await searchBookmarks("AI documentation", "test-key", undefined, dependencies)

    expect(systemOne).toHaveBeenCalledOnce()
    const request = systemOne.mock.calls[0][0]
    const state = request.state as { candidates: unknown[] }
    expect(state.candidates).toHaveLength(2)
    expect(Object.keys(request.questions)).toHaveLength(2)
    expect(response.results.map((result) => result.id)).toEqual(["b", "a"])
  })

  test("does not create a Jev client when there are no bookmarks", async () => {
    const createClient = vi.fn()
    const response = await searchBookmarks("anything", "test-key", undefined, {
      getBookmarkTree: vi.fn().mockResolvedValue([]),
      createClient,
    })

    expect(createClient).not.toHaveBeenCalled()
    expect(response).toEqual({
      results: [],
      bookmarkCount: 0,
      inputTokens: 0,
      outputTokens: 0,
    })
  })
})
