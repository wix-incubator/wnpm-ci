'use strict';
const shelljs = require('shelljs');
const fs = require('fs');

module.exports.setup = setup;

module.exports.readPackage = readPackage;
module.exports.writePackage = writePackage;

module.exports.exec = (cmd, cb) => exec(cmd, {silent: false}, cb);
module.exports.execSilent = (cmd, cb) => exec(cmd, {silent: true}, cb);

function readPackage() {
  return JSON.parse(fs.readFileSync('./package.json', {encoding: 'utf-8'}));
}

function writePackage(packageJson) {
  return fs.writeFileSync('./package.json', JSON.stringify(packageJson), {encoding: 'utf-8'});
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

function exec(cmd, opts) {
  let command;
  if (dotNvmrcPresent()) {
    console.log(`Running 'nvm exec ${cmd}'`);
    command = `unset npm_config_prefix && . ~/.nvm/nvm.sh > /dev/null 2>&1 && nvm use > /dev/null 2>&1 && ${cmd}`;
  } else {
    console.log(`Running '${cmd}'`);
    command = cmd;
  }

  const res = shelljs.exec(command, opts);
  if (res.code !== 0) {
    throw error(cmd, res.code, res.output);
  } else {
    return res.output;
  }
}

function dotNvmrcPresent() {
  return shelljs.test('-f', '.nvmrc');
}

function error(cmd, code, output) {
  return new Error(`'${cmd}' failed with code: ${code}, output: '${output}'`);
}
