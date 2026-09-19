import { describe, expect, test } from "vitest"
import { flattenBookmarkTree } from "../src/lib/bookmarks"

describe("flattenBookmarkTree", () => {
  test("keeps every bookmark with its folder path", () => {
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
              {
                id: "4",
                title: "TypeSafe docs",
                syncing: false,
                url: "https://docs.typesafe.ai",
                dateAdded: 50,
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
      {
        id: "4",
        title: "TypeSafe docs",
        url: "https://docs.typesafe.ai",
        path: "Work",
        dateAdded: 50,
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
