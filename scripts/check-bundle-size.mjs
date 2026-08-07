import { gzipSync } from 'node:zlib'
import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const outputDirectory = new URL('../dist/assets/', import.meta.url)
const outputPath = fileURLToPath(outputDirectory)

// This budget covers all shipped JS and CSS after gzip. At 180 KiB it accommodates the current
// React, Dexie and PWA baseline while still catching accidental large dependencies or bundled data.
const maximumCompressedBytes = 180 * 1024
const measuredExtensions = new Set(['.js', '.css'])

async function assetPaths(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const paths = await Promise.all(
    entries.map((entry) => {
      const path = join(fileURLToPath(directory), entry.name)
      return entry.isDirectory() ? assetPaths(new URL(`${entry.name}/`, directory)) : [path]
    }),
  )

  return paths.flat()
}

let paths
try {
  paths = (await assetPaths(outputDirectory)).filter((path) =>
    measuredExtensions.has(extname(path)),
  )
} catch (error) {
  console.error('Bundle output is missing. Run `npm run build` before checking its size.')
  throw error
}

if (paths.length === 0) {
  throw new Error('No JavaScript or CSS assets were found in dist/assets.')
}

const assets = await Promise.all(
  paths.map(async (path) => {
    const compressedBytes = gzipSync(await readFile(path)).byteLength
    return {
      name: relative(outputPath, path),
      compressedBytes,
    }
  }),
)
const totalCompressedBytes = assets.reduce((total, asset) => total + asset.compressedBytes, 0)
const kibibytes = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`

for (const asset of assets.sort((left, right) => right.compressedBytes - left.compressedBytes)) {
  console.log(`${asset.name}: ${kibibytes(asset.compressedBytes)} gzip`)
}
console.log(
  `Total JS + CSS: ${kibibytes(totalCompressedBytes)} gzip (budget ${kibibytes(maximumCompressedBytes)})`,
)

if (totalCompressedBytes > maximumCompressedBytes) {
  process.exitCode = 1
}
