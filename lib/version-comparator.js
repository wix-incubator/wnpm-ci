const path = require('path');
const versionFetcher = require('./version-fetcher');
const packageHandler = require('./package-handler');
const {compareDirectories} = require('./directory-diff');

module.exports = {
  compare: (cwd, version) => {
    const currVersionPath = versionFetcher.cloneAndPack(cwd);
    const {name} = packageHandler.readPackageJson(path.join(cwd, 'package.json'))
    const remoteVersionPath = versionFetcher.fetch(name, version, cwd);
    return compareDirectories(remoteVersionPath, currVersionPath);
  }
};
