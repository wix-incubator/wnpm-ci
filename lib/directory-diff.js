const versionFetcher = require('./version-fetcher');
const execa = require('execa');

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

async function compareDirectories(path1, path2) {
  await versionFetcher.copyVersion(path1, path2, 'package.json');
  await versionFetcher.copyVersion(path1, path2, 'npm-shrinkwrap.json', cleanShrinkwrap);
  try {
    await execa(`diff -rq ${path1} ${path2} -x .npmignore`, {shell: true});
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  compareDirectories
}
