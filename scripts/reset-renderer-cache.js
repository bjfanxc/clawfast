const fs = require('fs')
const path = require('path')

const cacheDir = path.join(__dirname, '..', 'renderer', '.next')

try {
  fs.rmSync(cacheDir, { recursive: true, force: true })
  console.log(`Cleared renderer cache: ${cacheDir}`)
} catch (error) {
  console.warn(`Failed to clear renderer cache: ${cacheDir}`)
  console.warn(error)
}
