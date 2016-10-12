'use strict';
var shelljs = require('shelljs');
var fs = require('fs');

module.exports.setup = setup;

module.exports.readPackage = readPackage;
module.exports.writePackage = writePackage;

module.exports.exec = (cmd, cb) => exec(cmd, {silent: false}, cb);
module.exports.execSilent = (cmd, cb) => exec(cmd, {silent: true}, cb);

function readPackage(cb) {
  try {
    cb(undefined, JSON.parse(shelljs.cat('./package.json')));
  } catch (e) {
    cb(e, undefined)
  }
}

function writePackage(packageJson, cb) {
  fs.writeFile('./package.json', JSON.stringify(packageJson), {encoding: 'utf-8'}, cb);
}

function setup() {
  if (dotNvmrcPresent()) {
    console.log('Found .nvmrc, running "nvm install"');
    const result = shelljs.exec('unset npm_config_prefix && . ~/.nvm/nvm.sh && nvm install', {silent: true});
    if (result.code !== 0) {
      throw error('nvm install', result.code, result.output);
    }
  }
}

function exec(cmd, opts, cb) {
  let command;
  if (dotNvmrcPresent()) {
    console.log(`Running 'nvm exec ${cmd}'`);
    command = `unset npm_config_prefix && . ~/.nvm/nvm.sh > /dev/null 2>&1 && nvm use > /dev/null 2>&1 && ${cmd}`;
  } else {
    console.log(`Running '${cmd}'`);
    command = cmd;
  }

  shelljs.exec(command, opts, (code, output) => {
    if (code !== 0) {
      cb(error(cmd, code, output), undefined);
    } else {
      cb(undefined, output)
    }
  });
}

function dotNvmrcPresent() {
  return shelljs.test('-f', '.nvmrc');
}

function error(cmd, code, output) {
  return new Error(`'${cmd}' failed with code: ${code}, output: '${output}'`);
}
