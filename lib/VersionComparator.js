"use strict";

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

module.exports = (directoryDiff, versionFetcher, shell) => {
  return {
    compare: (name, remoteVersion) => {
      const cwd = shell.pwd();
      return versionFetcher.cloneAndPack(cwd)
        .then((currVersionPath) =>
          versionFetcher.fetch(name, remoteVersion)
            .then((remoteVersionPath) => {
              versionFetcher.copyVersion(remoteVersionPath, currVersionPath, 'package.json');
              versionFetcher.copyVersion(remoteVersionPath, currVersionPath, 'npm-shrinkwrap.json', cleanShrinkwrap);

              return directoryDiff.compareDirectories(currVersionPath, remoteVersionPath)
                .then((areTheSame) => {
                  versionFetcher.cleanup();
                  return areTheSame;
                })
            })
        )
        .catch(() => {
          versionFetcher.cleanup();
          return false;
        });
    }
  };
};


