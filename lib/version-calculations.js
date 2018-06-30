const semver = require('semver');

function calculateRange(version, options) {
  if (options.shouldBumpMinor) {
    return semver.major(version) === 0 ? version + ' - 0' : '^' + version;
  } else {
    return '~' + version;
  }
}

function calculateCurrentPublished(version, publishedVersions, options = {}) {
  return semver.maxSatisfying(publishedVersions, calculateRange(version, options));
}

function calculateNextVersionPackage(version, publishedVersions, options = {}) {
  var result, publishedVersion = calculateCurrentPublished(version, publishedVersions, options);
  if (!publishedVersion) {
    return version;
  } else if (options.shouldBumpMinor) {
    result = [semver.major(version), semver.minor(publishedVersion) + 1, semver.patch(version)].join('.');
  } else {
    result = [semver.major(version), semver.minor(version), semver.patch(publishedVersion) + 1].join('.');
  }
  return result + (semver.prerelease(version) ? '-' + semver.prerelease(version).join('.') : '');
}

module.exports = {
  calculateCurrentPublished,
  calculateNextVersionPackage
}
