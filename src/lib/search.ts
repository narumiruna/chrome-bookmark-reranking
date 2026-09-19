import { flattenBookmarkTree } from "./bookmarks"
import {
  createRerankClient,
  type RerankClient,
  rerankBookmarks,
  type SemanticSearchResult,
} from "./rerank"

export const VISIBLE_RESULT_COUNT = 10

export interface SearchDependencies {
  getBookmarkTree: () => Promise<chrome.bookmarks.BookmarkTreeNode[]>
  createClient: (apiKey: string) => RerankClient
}

const DEFAULT_DEPENDENCIES: SearchDependencies = {
  getBookmarkTree: () => chrome.bookmarks.getTree(),
  createClient: createRerankClient,
}

export interface SearchResponse {
  results: SemanticSearchResult[]
  bookmarkCount: number
  model?: string
  inputTokens: number
  outputTokens: number
}

export async function searchBookmarks(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
  dependencies = DEFAULT_DEPENDENCIES,
): Promise<SearchResponse> {
  if (!apiKey.trim()) {
    throw new Error("A TypeSafe API key is required")
  }

  const tree = await dependencies.getBookmarkTree()
  const bookmarks = flattenBookmarkTree(tree)

  if (bookmarks.length === 0) {
    return {
      results: [],
      bookmarkCount: 0,
      inputTokens: 0,
      outputTokens: 0,
    }
  }

  const reranked = await rerankBookmarks(
    bookmarks,
    query,
    dependencies.createClient(apiKey),
    signal,
  )

  return {
    results: reranked.results,
    bookmarkCount: bookmarks.length,
    model: reranked.model,
    inputTokens: reranked.inputTokens,
    outputTokens: reranked.outputTokens,
  }
}
