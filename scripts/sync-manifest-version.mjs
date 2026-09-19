import { readFile, writeFile } from "node:fs/promises"

const packageUrl = new URL("../package.json", import.meta.url)
const manifestUrl = new URL("../src/manifest.json", import.meta.url)
const checkOnly = process.argv.includes("--check")

const packageJson = JSON.parse(await readFile(packageUrl, "utf8"))
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"))

if (manifest.version === packageJson.version) {
  process.exit(0)
}

if (checkOnly) {
  throw new Error(
    `Version mismatch: package.json is ${packageJson.version}, but manifest.json is ${manifest.version}`,
  )
}

manifest.version = packageJson.version
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`)
