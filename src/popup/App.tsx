import {
  BookmarkFilledIcon,
  CheckCircledIcon,
  Cross2Icon,
  ExternalLinkIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  GearIcon,
  GlobeIcon,
  InfoCircledIcon,
  LockClosedIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@radix-ui/react-icons"
import {
  Badge,
  Box,
  Button,
  Callout,
  Dialog,
  Flex,
  Heading,
  IconButton,
  Link,
  ScrollArea,
  Separator,
  Spinner,
  Text,
  TextField,
  Theme,
  Tooltip,
} from "@radix-ui/themes"
import { type FormEvent, useEffect, useRef, useState } from "react"
import { describeSearchError } from "../lib/errors"
import type { SemanticSearchResult } from "../lib/rerank"
import { searchBookmarks, VISIBLE_RESULT_COUNT } from "../lib/search"
import { getApiKey, saveApiKey } from "../lib/storage"

interface SearchMeta {
  bookmarkCount: number
  model?: string
}

function displayUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname === "/" ? "" : parsed.pathname}`
  } catch {
    return url
  }
}

function ApiKeyDialog({
  open,
  savedKey,
  onOpenChange,
  onSave,
}: {
  open: boolean
  savedKey: string
  onOpenChange: (open: boolean) => void
  onSave: (apiKey: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(savedKey)
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    if (open) {
      setDraft(savedKey)
      setSaveError("")
    }
  }, [open, savedKey])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaveError("")
    try {
      await onSave(draft)
    } catch {
      setSaveError("Chrome could not save the API key. Try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    setSaveError("")
    try {
      await onSave("")
      setDraft("")
    } catch {
      setSaveError("Chrome could not remove the API key. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="settings-dialog" maxWidth="400px">
        <Flex align="start" justify="between" gap="4">
          <Box>
            <Dialog.Title>TypeSafe settings</Dialog.Title>
            <Dialog.Description size="2" color="gray">
              Add your own key to turn on semantic reranking.
            </Dialog.Description>
          </Box>
          <Dialog.Close>
            <IconButton variant="ghost" color="gray" aria-label="Close settings">
              <Cross2Icon />
            </IconButton>
          </Dialog.Close>
        </Flex>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="3" mt="5">
            <Flex justify="between" align="center">
              <Text as="label" htmlFor="api-key" size="2" weight="medium">
                TYPESAFE_API_KEY
              </Text>
              <Link href="https://console.typesafe.ai/" target="_blank" size="1">
                Get a key <ExternalLinkIcon />
              </Link>
            </Flex>
            <TextField.Root
              id="api-key"
              type={revealed ? "text" : "password"}
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              placeholder="Paste your API key"
              autoComplete="off"
              spellCheck={false}
            >
              <TextField.Slot>
                <LockClosedIcon />
              </TextField.Slot>
              <TextField.Slot side="right">
                <Tooltip content={revealed ? "Hide key" : "Show key"}>
                  <IconButton
                    type="button"
                    size="1"
                    variant="ghost"
                    color="gray"
                    aria-label={revealed ? "Hide API key" : "Show API key"}
                    onClick={() => setRevealed((value) => !value)}
                  >
                    {revealed ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </IconButton>
                </Tooltip>
              </TextField.Slot>
            </TextField.Root>

            <Callout.Root color="amber" size="1" variant="surface">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                Stored only in <code>chrome.storage.local</code>. Searches send every bookmark
                title, URL, and folder path to TypeSafe, so use a dedicated, revocable key.
              </Callout.Text>
            </Callout.Root>

            {saveError ? (
              <Callout.Root color="red" size="1" variant="surface">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>{saveError}</Callout.Text>
              </Callout.Root>
            ) : null}

            <Flex justify={savedKey ? "between" : "end"} align="center" mt="2">
              {savedKey ? (
                <Button
                  type="button"
                  variant="soft"
                  color="red"
                  onClick={handleRemove}
                  disabled={saving}
                >
                  <TrashIcon /> Remove key
                </Button>
              ) : null}
              <Button type="submit" disabled={!draft.trim() || saving}>
                {saving ? <Spinner /> : <CheckCircledIcon />}
                Save key
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function ResultCard({
  result,
  position,
  onOpen,
}: {
  result: SemanticSearchResult
  position: number
  onOpen: (url: string) => void
}) {
  return (
    <button className="result-card" type="button" onClick={() => onOpen(result.url)}>
      <span className="result-position">{position}</span>
      <span className="result-icon" aria-hidden="true">
        <GlobeIcon />
      </span>
      <span className="result-copy">
        <span className="result-title">{result.title}</span>
        <span className="result-url">{displayUrl(result.url)}</span>
        {result.path ? <span className="result-path">{result.path}</span> : null}
      </span>
      <span className="result-aside">
        <Badge color="indigo" variant="soft" radius="full">
          {Math.round(result.relevance * 100)}%
        </Badge>
        <ExternalLinkIcon className="open-icon" />
      </span>
    </button>
  )
}

export function App() {
  const [query, setQuery] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [results, setResults] = useState<SemanticSearchResult[]>([])
  const [meta, setMeta] = useState<SearchMeta>({ bookmarkCount: 0 })
  const [notice, setNotice] = useState("")
  const abortController = useRef<AbortController | null>(null)

  useEffect(() => {
    void getApiKey().then(setApiKey)
    return () => abortController.current?.abort()
  }, [])

  async function handleSaveKey(nextKey: string) {
    const trimmedKey = nextKey.trim()
    await saveApiKey(trimmedKey)
    setApiKey(trimmedKey)
    setSettingsOpen(false)
    setNotice(trimmedKey ? "API key saved. AI ranking is ready." : "API key removed.")
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const intent = query.trim()
    if (!intent) return
    if (!apiKey) {
      setNotice("Add a TypeSafe API key before searching.")
      setSettingsOpen(true)
      return
    }

    abortController.current?.abort()
    const controller = new AbortController()
    abortController.current = controller
    setLoading(true)
    setNotice("")
    setHasSearched(true)

    try {
      const response = await searchBookmarks(intent, apiKey, controller.signal)
      if (controller.signal.aborted) return
      setResults(response.results.slice(0, VISIBLE_RESULT_COUNT))
      setMeta({ bookmarkCount: response.bookmarkCount, model: response.model })
    } catch (error) {
      if (controller.signal.aborted) return
      setResults([])
      setNotice(describeSearchError(error))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  async function openBookmark(url: string) {
    try {
      await chrome.tabs.create({ url })
      window.close()
    } catch {
      setNotice("Chrome could not open this bookmark.")
    }
  }

  return (
    <Theme accentColor="indigo" grayColor="slate" radius="large" scaling="95%">
      <div className="app-shell">
        <header className="topbar">
          <Flex align="center" gap="3">
            <span className="brand-mark">
              <BookmarkFilledIcon />
            </span>
            <Box>
              <Heading as="h1" size="3">
                Bookmark Compass
              </Heading>
              <Text as="div" size="1" color="gray">
                Search by meaning, not memory
              </Text>
            </Box>
          </Flex>
          <Tooltip content="TypeSafe settings">
            <IconButton
              variant="soft"
              color={apiKey ? "indigo" : "gray"}
              aria-label="Open TypeSafe settings"
              onClick={() => setSettingsOpen(true)}
            >
              <GearIcon />
            </IconButton>
          </Tooltip>
        </header>

        <main className="main-content">
          <section className="search-section">
            <Flex align="center" justify="between" mb="3">
              <Badge color={apiKey ? "indigo" : "gray"} variant="soft" radius="full">
                {apiKey ? <MagicWandIcon /> : <LockClosedIcon />}
                {apiKey ? "Jev search ready" : "API key required"}
              </Badge>
              {!apiKey ? (
                <Button size="1" variant="ghost" onClick={() => setSettingsOpen(true)}>
                  Add API key
                </Button>
              ) : null}
            </Flex>

            <form onSubmit={handleSearch}>
              <Flex gap="2">
                <TextField.Root
                  className="search-input"
                  size="3"
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  placeholder="e.g. the article about better React forms"
                  autoFocus
                  aria-label="Describe the bookmark you want"
                >
                  <TextField.Slot>
                    <MagnifyingGlassIcon />
                  </TextField.Slot>
                </TextField.Root>
                <Button size="3" type="submit" disabled={!query.trim() || loading}>
                  {loading ? <Spinner /> : <MagnifyingGlassIcon />}
                  Find
                </Button>
              </Flex>
            </form>
            <Text as="p" size="1" color="gray" mt="2">
              Describe a topic, task, or half-remembered page.
            </Text>
          </section>

          {notice ? (
            <Callout.Root
              className="notice"
              color={notice.includes("saved") ? "green" : "amber"}
              size="1"
            >
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>{notice}</Callout.Text>
            </Callout.Root>
          ) : null}

          <section className="results-section" aria-live="polite">
            {loading ? (
              <Flex
                className="state-panel"
                direction="column"
                align="center"
                justify="center"
                gap="3"
              >
                <span className="loading-orbit">
                  <MagicWandIcon />
                </span>
                <Text weight="medium">Reading the compass…</Text>
                <Text size="1" color="gray">
                  Jev is judging every bookmark
                </Text>
              </Flex>
            ) : results.length > 0 ? (
              <>
                <Flex align="center" justify="between" px="1" pb="2">
                  <Text size="1" weight="bold" className="eyebrow">
                    BEST MATCHES
                  </Text>
                  <Text size="1" color="gray">
                    {`Ranked by ${meta.model ?? "Jev"}`}
                  </Text>
                </Flex>
                <ScrollArea className="results-scroll" type="auto" scrollbars="vertical">
                  <Flex direction="column" gap="2" pr="2">
                    {results.map((result, index) => (
                      <ResultCard
                        key={result.id}
                        result={result}
                        position={index + 1}
                        onOpen={(url) => void openBookmark(url)}
                      />
                    ))}
                  </Flex>
                </ScrollArea>
              </>
            ) : hasSearched ? (
              <Flex
                className="state-panel"
                direction="column"
                align="center"
                justify="center"
                gap="3"
              >
                <span className="empty-icon">
                  <MagnifyingGlassIcon />
                </span>
                <Text weight="medium">No bookmarks found</Text>
                <Text size="2" color="gray" align="center">
                  Try a broader description or check that Chrome has bookmarks to search.
                </Text>
              </Flex>
            ) : (
              <Flex className="welcome-panel" direction="column" gap="4">
                <span className="compass-art" aria-hidden="true">
                  <span className="compass-ring" />
                  <span className="compass-needle" />
                  <BookmarkFilledIcon />
                </span>
                <Box>
                  <Heading as="h2" size="4" align="center">
                    Find the page you meant
                  </Heading>
                  <Text as="p" size="2" color="gray" align="center" mt="2">
                    Jev judges every bookmark against your prompt in one request.
                  </Text>
                </Box>
                <Flex className="privacy-chip" align="center" gap="2">
                  <LockClosedIcon />
                  <Text size="1">All bookmark titles, URLs, and folders are sent to TypeSafe</Text>
                </Flex>
              </Flex>
            )}
          </section>
        </main>

        <footer className="footer">
          <Separator size="4" />
          <Flex justify="between" align="center" pt="3">
            <Text size="1" color="gray">
              {meta.bookmarkCount > 0
                ? `${meta.bookmarkCount} bookmarks available`
                : "Chrome bookmarks"}
            </Text>
            <Flex align="center" gap="1">
              <Text size="1" color="gray">
                Powered by TypeSafe
              </Text>
              <MagicWandIcon className="footer-spark" />
            </Flex>
          </Flex>
        </footer>

        <ApiKeyDialog
          open={settingsOpen}
          savedKey={apiKey}
          onOpenChange={setSettingsOpen}
          onSave={handleSaveKey}
        />
      </div>
    </Theme>
  )
}
