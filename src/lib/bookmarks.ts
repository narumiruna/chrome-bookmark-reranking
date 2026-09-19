export interface BookmarkItem {
  id: string
  title: string
  url: string
  path: string
  dateAdded: number
}

export interface LocalSearchResult extends BookmarkItem {
  localScore: number
}

const TOKEN_PATTERN = /[^\p{L}\p{N}]+/gu

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase()
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(TOKEN_PATTERN)
    .filter((token) => token.length > 0)
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

export function flattenBookmarkTree(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  parentFolders: string[] = [],
): BookmarkItem[] {
  const bookmarks: BookmarkItem[] = []

  for (const node of nodes) {
    if (node.url) {
      bookmarks.push({
        id: node.id,
        title: node.title.trim() || hostname(node.url) || node.url,
        url: node.url,
        path: parentFolders.join(" / "),
        dateAdded: node.dateAdded ?? 0,
      })
    }

    if (node.children) {
      const folders = node.title.trim() ? [...parentFolders, node.title.trim()] : parentFolders
      bookmarks.push(...flattenBookmarkTree(node.children, folders))
    }
  }

  return bookmarks
}

function scoreBookmark(bookmark: BookmarkItem, query: string): number {
  const phrase = normalize(query.trim())
  const title = normalize(bookmark.title)
  const url = normalize(bookmark.url)
  const host = normalize(hostname(bookmark.url))
  const path = normalize(bookmark.path)
  let score = 0

  if (title.includes(phrase)) score += 100
  if (host.includes(phrase)) score += 45
  if (url.includes(phrase)) score += 30
  if (path.includes(phrase)) score += 20

  for (const token of tokenize(phrase)) {
    if (title.includes(token)) score += 18
    if (host.includes(token)) score += 12
    if (path.includes(token)) score += 8
    if (url.includes(token)) score += 5
  }

  return score
}

export function shortlistBookmarks(
  bookmarks: BookmarkItem[],
  query: string,
  limit = 18,
): LocalSearchResult[] {
  if (!query.trim() || limit <= 0) return []

  return bookmarks
    .map((bookmark) => ({ ...bookmark, localScore: scoreBookmark(bookmark, query) }))
    .sort(
      (left, right) =>
        right.localScore - left.localScore ||
        right.dateAdded - left.dateAdded ||
        left.title.localeCompare(right.title),
    )
    .slice(0, limit)
}
