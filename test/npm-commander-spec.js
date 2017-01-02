'use strict';
const commander = require('../lib/npm-commander'),
  support = require('./support'),
  expect = require('chai').expect,
  intercept = require('intercept-stdout');

describe('npm commander', function() {
  this.timeout(10000);
  let tempDir, unhook, stdout = '';

  beforeEach(() => {
    stdout = '';
    unhook = intercept(txt  => stdout += txt)
  });

  afterEach(() => {
    unhook();
    support.rmFolder(tempDir);
  });

  describe('for a project with malformed .nvmrc', () => {

    beforeEach(() => tempDir = support.clone({folder: './test/apps/nvmrc-malformed'}));

    it('setup() should fail', () => {
      expect(() => commander.setup()).to.throw('\'nvm install\' failed');
    });
  });

  describe('for a project with .nvmrc', () => {

    beforeEach(() => {
      tempDir = support.clone({folder: './test/apps/with-nvmrc'});
      commander.setup();
    });

    it('exec() should fail given an invalid command', () => {
      expect(() => commander.exec('npmzqwe install')).to.throw('not found');
    });

    it('exec() should run command via "nvm", print command execution output, return collected output', () => {
      const output = commander.exec('npm install');
      expect(stdout).to.contain('Running \'nvm exec npm install\'');
      expect(output).to.contain('npm WARN');
    });
  });

  describe('for a project without .nvmrc', () => {

    beforeEach(() => {
      tempDir = support.clone({folder: './test/apps/without-nvmrc'});
    });

    it('exec() should fail given an invalid command', () => {
      expect(() => commander.exec('npmzqwe install')).to.throw('not found');
    });

    it('exec() should run command via "nvm", print command execution output, return collected output', () => {
      const output = commander.exec('npm install');
      expect(stdout).to.contain('Running \'npm install\'');
      expect(output).to.contain('npm WARN');
    });
  });

  describe('execSilent() should not print command output to stdout', () => {

    beforeEach(() => tempDir = support.clone({folder: './test/apps/without-nvmrc'}));

    it('exec() should run command in silent mode', () => {
      const output = commander.exec('npm install');
      expect(stdout).to.not.contain('npm WARN');
      expect(output).to.contain('npm WARN');
    });
  });
});