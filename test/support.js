'use strict';
const shelljs = require('shelljs'),
  path = require('path'),
  _ = require('lodash'),
  fs = require('fs');

module.exports.tarExtract = tarExtract;
module.exports.cloneDir = cloneDir;
module.exports.clone = opts => cloneFolder(opts);
module.exports.readPackageJson = readPackageJson;
module.exports.writePackageJson = writePackageJson;
module.exports.addLineToReadme = addLineToReadme;
module.exports.rmFolder = rmFolder;

function cloneFolder(opts) {
  const options = _.merge(defaults(), opts);
  var clonedDir = getRandomDirectoryName();

  shelljs.mkdir(clonedDir);
  shelljs.cp('-r', `${options.folder}/*`, clonedDir);
  shelljs.cp('-r', `${options.folder}/.*`, clonedDir);

  shelljs.pushd(clonedDir);

  const packageJson = readPackageJson();
  if (packageJson.name) {
    packageJson.name = options.name;
  }
  if (options.registry) {
    packageJson.publishConfig = {registry: options.registry};
  }
  packageJson.private = options.private;
  writePackageJson(packageJson);
  return clonedDir;
}

function tarExtract(inputFile, cb) {
  shelljs.exec(`tar -xf ${inputFile}`, cb);
}

function cloneDir() {
  var clonedDir = getRandomDirectoryName();

  shelljs.mkdir(clonedDir);
  shelljs.pushd(clonedDir);

  return clonedDir;
}

function getRandomDirectoryName() {
  return path.resolve(shelljs.tempdir(), Math.ceil(Math.random() * 100000).toString());
}

function rmFolder(dir) {
  shelljs.popd();
  shelljs.rm('-r', dir);
}

function readPackageJson() {
  return JSON.parse(shelljs.cat('package.json'));
}

function writePackageJson(packageJson) {
  fs.writeFileSync('package.json', JSON.stringify(packageJson), 'utf8');
}

function addLineToReadme() {
  const readmeFileName = 'README.md';
  let content = Date.now();

  if (fs.existsSync(readmeFileName)){
    content = fs.readFileSync(readmeFileName);
    content = content + `\n${Date.now()}`;
  }
  fs.writeFileSync(readmeFileName, content, 'utf8');
}

function defaults() {
  return {
    folder: '.',
    name: undefined,
    private: false,
    registry: 'http://repo.dev.wix/artifactory/api/npm/npm-local/'
  };
}
