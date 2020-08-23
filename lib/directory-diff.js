const versionFetcher = require('./version-fetcher')
const execa = require('execa')
const { join } = require('path')

function cleanShrinkwrap(json) {
  for (const key in json) {
    if (typeof json[key] === 'object') {
      json[key] = cleanShrinkwrap(json[key])
    } else if (typeof json[key] === 'string' && key !== 'version') {
      delete json[key]
    }
  }
  return json
}

async function compareDirectories(path1, path2) {
  await versionFetcher.copyVersion(path1, path2, 'package.json')
  await versionFetcher.copyVersion(path1, path2, 'npm-shrinkwrap.json', cleanShrinkwrap)
  try {
    await execa(`diff -rq ${path1} ${path2} -x .npmignore`, {shell: true})
    return true
  } catch (e) {
    console.log('Noticed a difference in directories:')
    console.log(e.stdout)
    if (e.stdout.indexOf('package.json differ') > -1) {
      console.log('There was a diff in the package.json:')
      await execa(`diff ${join(path1, 'package.json')} ${join(path2, 'package.json')}`, { shell: true, stdio: 'inherit', reject: false })
    }
    return false
  }
}

module.exports = {
  compareDirectories
}
