const fs = require('fs');
const path = require('path');

module.exports = {
  writePackageJson: (pathToPackage, packageJson) => {
    fs.writeFileSync(path.resolve(pathToPackage), JSON.stringify(packageJson, null, 2), {encoding: 'utf-8'});
  },
  readPackageJson: (pathToPackage) => {
    return JSON.parse(fs.readFileSync(path.resolve(pathToPackage)));
  }
};
