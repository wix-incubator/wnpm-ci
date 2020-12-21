const semver = require('semver')

function maxVersion(a, b) {
  return semver.gt(a, b) ? a : b
}

function calculateRange(version) {
  return semver.major(version) === 0 ? `${version} - 0` : `^${version}`
}

function calculateCurrentPublished(version, publishedVersions) {
  return semver.maxSatisfying(publishedVersions, calculateRange(version))
}

function calculateNextVersionPackage(version, publishedVersions, options = {}) {
  let result
  const publishedVersion = calculateCurrentPublished(version, publishedVersions, options)
  if (!publishedVersion) {
    return version
  } else if (options.shouldBumpMinor) {
    result = semver.inc(maxVersion(version, publishedVersion), 'minor')
  } else {
    result = semver.inc(maxVersion(version, publishedVersion), 'patch')
  }
  return result + (semver.prerelease(version) ? `-${semver.prerelease(version).join('.')}` : '')
}

module.exports = {
  calculateCurrentPublished,
  calculateNextVersionPackage
}
