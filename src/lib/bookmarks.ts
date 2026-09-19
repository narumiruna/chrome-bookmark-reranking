export interface BookmarkItem {
  id: string
  title: string
  url: string
  path: string
  dateAdded: number
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
