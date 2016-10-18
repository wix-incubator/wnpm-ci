"use strict";
var path = require('path');

module.exports = (fs, shell) => ({
  writePackageJson: (pathToPackge, packageJson) => {
    fs.writeFileSync(path.resolve(pathToPackge), JSON.stringify(packageJson, null, 2), 'utf8');
  },
  readPackageJson: (pathToPackge) => {
    return JSON.parse(shell.cat(path.resolve(pathToPackge)));
  }
});
