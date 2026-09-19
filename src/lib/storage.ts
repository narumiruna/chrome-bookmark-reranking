const API_KEY_STORAGE_KEY = "typesafeApiKey"

export async function getApiKey(): Promise<string> {
  const result = await chrome.storage.local.get(API_KEY_STORAGE_KEY)
  const value = result[API_KEY_STORAGE_KEY]
  return typeof value === "string" ? value : ""
}

export async function saveApiKey(apiKey: string): Promise<void> {
  const trimmedKey = apiKey.trim()

  if (trimmedKey) {
    await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: trimmedKey })
    return
  }

  await chrome.storage.local.remove(API_KEY_STORAGE_KEY)
}
