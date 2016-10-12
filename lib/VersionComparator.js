"use strict";
module.exports = (directoryDiff, versionFetcher, shell) => {
  return {
    compare: (name, remoteVersion) => {
      const cwd = shell.pwd();
      return versionFetcher.cloneAndPack(cwd)
        .then((currVersionPath) =>
          versionFetcher.fetch(name, remoteVersion)
            .then((remoteVersionPath) => {
              versionFetcher.copyVersion(remoteVersionPath, currVersionPath);
              versionFetcher.reWritePacakge(remoteVersionPath);

              return directoryDiff.compareDirectories(currVersionPath, remoteVersionPath)
                .then((areTheSame) => {
                  versionFetcher.cleanup();
                  return areTheSame;
                })
            })
        );
    }
  };
};


