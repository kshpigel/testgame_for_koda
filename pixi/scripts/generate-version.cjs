const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const version = pkg.version

let hash = ''
try {
  hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
} catch (e) {
  console.warn('Git not available, using empty hash')
}

const content = `export const GAME_VERSION = '${version}-${hash}'\n`
fs.writeFileSync(path.join(__dirname, '../src/data/version.js'), content)

console.log(`Version: ${version}-${hash}`)
