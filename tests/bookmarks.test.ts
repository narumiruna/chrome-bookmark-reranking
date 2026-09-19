import { describe, expect, test } from "vitest"
import { flattenBookmarkTree, shortlistBookmarks } from "../src/lib/bookmarks"

describe("flattenBookmarkTree", () => {
  test("keeps bookmark folder paths and ignores folder-only nodes", () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      {
        id: "0",
        title: "",
        syncing: false,
        children: [
          {
            id: "1",
            title: "Work",
            syncing: false,
            children: [
              {
                id: "2",
                title: "Design",
                syncing: false,
                children: [
                  {
                    id: "3",
                    title: "Radix Themes",
                    syncing: false,
                    url: "https://www.radix-ui.com/themes/docs/overview/getting-started",
                    dateAdded: 42,
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    expect(flattenBookmarkTree(tree)).toEqual([
      {
        id: "3",
        title: "Radix Themes",
        url: "https://www.radix-ui.com/themes/docs/overview/getting-started",
        path: "Work / Design",
        dateAdded: 42,
      },
    ])
  })

  test("uses the hostname when a bookmark has no title", () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      {
        id: "1",
        title: "",
        syncing: false,
        url: "https://www.example.com/guide",
      },
    ]

    expect(flattenBookmarkTree(tree)[0].title).toBe("example.com")
  })
})

describe("shortlistBookmarks", () => {
  const bookmarks = [
    {
      id: "1",
      title: "React form patterns",
      url: "https://example.com/react-forms",
      path: "Engineering",
      dateAdded: 10,
    },
    {
      id: "2",
      title: "Weekend recipes",
      url: "https://food.example/recipes",
      path: "Personal",
      dateAdded: 30,
    },
    {
      id: "3",
      title: "Uncontrolled inputs",
      url: "https://react.dev/learn/sharing-state-between-components",
      path: "Engineering / React",
      dateAdded: 20,
    },
  ]

  test("prioritizes matches across title, URL, and folder path", () => {
    const results = shortlistBookmarks(bookmarks, "react forms", 3)

    expect(results.map((result) => result.id)).toEqual(["1", "3", "2"])
    expect(results[0].localScore).toBeGreaterThan(results[1].localScore)
  })

  test("uses recent bookmarks as fallback candidates when words do not match", () => {
    const results = shortlistBookmarks(bookmarks, "completely semantic intent", 2)

    expect(results.map((result) => result.id)).toEqual(["2", "3"])
  })

  test("returns no candidates for an empty query", () => {
    expect(shortlistBookmarks(bookmarks, "   ")).toEqual([])
  })
})
