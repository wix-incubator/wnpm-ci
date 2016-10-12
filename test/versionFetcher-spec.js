"use strict";
var sinon = require('sinon');
var expect = require('chai').expect;
var assert = require('chai').assert;
var _ = require('lodash');
var VersionFetcher = require('../lib/VersionFetcher');

describe('VersionFetcher', () => {
  const packageVersion = '1.2.3';
  const packageName = 'moshe';
  const rootTempPath = '/tmp';

  let commander;
  const aggregateCommand = (cmdName) => (arg, cb) => {
    let tmpl = `${arg}`;
    if (cmdName) {
      tmpl = `${cmdName} ${arg}`
    }
    commands.push(tmpl);
    if (cb) {
      cb();
    }
  };

  const tarFileName = `${packageName}-${packageVersion}.tgz`;
  const randomDir = 'v1';

  let shell;
  let randomDirGenerator;
  let packageHandler;
  let versionFetcher;
  let commands;
  beforeEach(() => {
    commands = [];

    commander = {
      exec: (arg, cb) => {
        commands.push(arg);
        if (arg.indexOf('npm pack') > -1) {
          cb(undefined, tarFileName);
        } else {
          cb();
        }
      }
    };

    shell = {
      exec: aggregateCommand(),
      tempdir: () => rootTempPath,
      pushd: aggregateCommand('pushd'),
      popd: () => commands.push('popd'),
      mkdir: aggregateCommand('mkdir'),
      cp: (flag, from, dest) => commands.push(`cp ${flag} ${from} ${dest}`),
      rm: (options, dest) => commands.push(`rm ${options} ${dest}`)
    };

    randomDirGenerator = {
      generate: sinon.stub().returns(randomDir)
    };
    packageHandler = {
      readPackageJson: sinon.stub().returns({version: '123'}),
      writePackageJson: sinon.stub().returns()
    };

    versionFetcher = VersionFetcher(commander, shell, randomDirGenerator, packageHandler);
  });

  it('should retrieve the version from npm and pack it', (done) => {
    versionFetcher.fetch(packageName, packageVersion)
      .then((pathToVersion) => {
        assert.deepEqual(commands, [
          'mkdir /tmp/v1',
          'pushd /tmp/v1',
          `npm pack ${packageName}@${packageVersion}`,
          `tar -xf ${tarFileName}`
        ]);
        expect(pathToVersion).to.be.string(`${rootTempPath}/v1/package`);
        done();
      });
  });

  it('should pack current package', (done) => {
    var cwd = 'cwd';

    versionFetcher.cloneAndPack(cwd).then((pathToCloned) => {
      assert.deepEqual(commands, [
        'mkdir /tmp/v1',
        'pushd /tmp/v1',
        `npm pack ${cwd}`,
        `tar -xf *.tgz`
      ]);
      expect(pathToCloned).to.be.string(`${rootTempPath}/v1/package`);
      done();
    });
  });

  it('should copy the version from one package to another', (done) => {
    const remotePath = 'remote';
    const localPath = 'local';
    const remoteVersion = 'remote version';
    const localVersion = 'local version';

    const packageHandler = {
      readPackageJson: (path) => {
        if (path == remotePath) {
          return {version: remoteVersion}
        } else if (path == localPath) {
          return {version: localVersion}
        }
      },

      writePackageJson: (path, currPackage) => {
        expect(path).to.be.string(localPath);
        expect(currPackage.version).to.be.string(remoteVersion);
        done();
      }
    };

    const versionFetcher = VersionFetcher(commander, shell, randomDirGenerator, packageHandler);
    versionFetcher.copyVersion(remotePath, localPath);
  });

  it('should rewrite the package file', (done) => {
    const localPath = 'local';
    const localVersion = 'local version';

    const packageHandler = {
      readPackageJson: () => ({version: localVersion}),
      writePackageJson: (path, currPackage) => {
        expect(path).to.be.string(localPath);
        assert.deepEqual(currPackage, {version: localVersion});
        done();
      }
    };

    const versionFetcher = VersionFetcher(commander, shell, randomDirGenerator, packageHandler);
    versionFetcher.reWritePacakge(localPath)
  });

  it('should remove directories when done', (done) => {
    const cwd = '/';
    const randomDir1 = 'randomDir1';
    const randomDir2 = 'randomDir2';
    randomDirGenerator.generate
      .onCall(0).returns(randomDir1)
      .onCall(1).returns(randomDir2);

    Promise.all([
      versionFetcher.fetch(packageName, packageVersion),
      versionFetcher.cloneAndPack(cwd)])
      .then( _ => {
        versionFetcher.cleanup();
        expect(commands).to.contain('popd');
        expect(commands).to.contain(`rm -rf ${rootTempPath + '/' + randomDir1}`);
        expect(commands).to.contain(`rm -rf ${rootTempPath + '/' + randomDir2}`);
        done();
      });
  });

  describe('should propagate errors', () => {
    const cwd = '/';

    //TODO handle errors in shelljs non-callbacked functions
    describe('command err', () => {
      let versionFetcher;

      beforeEach(() => {
        const givenNpmErr = {
          exec: (arg, cb) => {
            cb('error');
          }
        };

        versionFetcher = VersionFetcher(givenNpmErr,
          shell,
          randomDirGenerator,
          packageHandler);
      });
      it('fetch', (done) => {
        versionFetcher.fetch('name', 'version')
          .catch((err) => {
            expect(err).to.be.equal('error');
            done();
          });
      });

      it('cloneAndPack', (done) => {
        versionFetcher.cloneAndPack(cwd).catch((err) => {
          expect(err).to.be.equal('error');
          done();
        });
      });
    });

    describe('command err', () => {
      let versionFetcher;

      beforeEach(() => {
        let shellErr = shell;
        shellErr.exec = (cmd, cb) => cb(1, '123', 'error');

        versionFetcher = VersionFetcher(commander,
          shellErr,
          randomDirGenerator,
          packageHandler);
      });

      it('fetch', (done) => {
        versionFetcher.fetch('name', 'version')
          .catch((err) => {
            expect(err).to.be.equal('error');
            done();
          });
      });

      it('cloneAndPack', (done) => {
        versionFetcher.cloneAndPack(cwd).catch((err) => {
          expect(err).to.be.equal('error');
          done();
        });
      });
    });
  });
});
