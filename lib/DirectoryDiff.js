"use strict";
const thenify = require('thenify');

module.exports = (shell) => {
  function shellExec(cmd, cb) {
    shell.exec(cmd, (code, stdout, stderr) => {
      switch (code) {
        case 0:
          cb(undefined, true);
          break;
        case 1:
          cb(undefined, false);
          break;
        default:
          cb(stderr);
      }
    });
  }

  shellExec = thenify(shellExec);

  return {
    compareDirectories: (path1, path2) => shellExec(`diff -rq ${path1} ${path2}`)
  }
};
