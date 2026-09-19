import { flattenBookmarkTree, shortlistBookmarks } from "./bookmarks"
import { createRerankClient, rerankBookmarks, type SemanticSearchResult } from "./rerank"

export const SHORTLIST_SIZE = 18
export const VISIBLE_RESULT_COUNT = 10

export interface SearchResponse {
  results: SemanticSearchResult[]
  bookmarkCount: number
  usedAi: boolean
  model?: string
  inputTokens?: number
  outputTokens?: number
}

export async function searchBookmarks(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const tree = await chrome.bookmarks.getTree()
  const bookmarks = flattenBookmarkTree(tree)
  const shortlist = shortlistBookmarks(bookmarks, query, SHORTLIST_SIZE)

  if (!apiKey) {
    return {
      results: shortlist.map((bookmark) => ({ ...bookmark, relevance: 0 })),
      bookmarkCount: bookmarks.length,
      usedAi: false,
    }
  }

  const reranked = await rerankBookmarks(shortlist, query, createRerankClient(apiKey), signal)

  return {
    results: reranked.results,
    bookmarkCount: bookmarks.length,
    usedAi: true,
    model: reranked.model,
    inputTokens: reranked.inputTokens,
    outputTokens: reranked.outputTokens,
  }
}
