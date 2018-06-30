const versionFetcher = require('./version-fetcher');
const {execSync} = require('child_process');

function cleanShrinkwrap(json) {
  for (let key in json) {
    if (typeof json[key] === 'object') {
      json[key] = cleanShrinkwrap(json[key]);
    } else if (typeof json[key] === 'string' && key !== 'version') {
      delete json[key];
    }
  }
  return json;
}

function compareDirectories(path1, path2) {
  versionFetcher.copyVersion(path1, path2, 'package.json');
  versionFetcher.copyVersion(path1, path2, 'npm-shrinkwrap.json', cleanShrinkwrap);
  try {
    execSync(`diff -rq ${path1} ${path2} -x .npmignore`);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  compareDirectories
}
