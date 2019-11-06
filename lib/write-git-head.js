/* Module to create a .git/HEAD file with hash from BUILD_VCS_NUMBER variable
  Npm will read this hash and add it as a `gitHead` field to published package.
  Check out more: https://github.com/npm/read-package-json/blob/6bac747004d5bc334a9f37c3799a965954d16641/read-json.js#L338
*/

const fs = require('fs-extra');
const path = require('path');
const mkdirp = require('mkdirp');
const util = require('util');

const mkdirPPromise = util.promisify(mkdirp);

const writeGitHead = async dir => {
  const commitSha = process.env.BUILD_VCS_NUMBER;
  if (commitSha) {
    // Check if HEAD already exists
    const head = path.resolve(dir, '.git/HEAD');
    if (await fs.exists(head)) {
      return null;
    }
    // If no, create new one and write a hash.
    await mkdirPPromise(path.dirname(head));
    await fs.writeFile(head, commitSha, {encoding: 'utf-8'});
    return commitSha;
  }
};

module.exports = writeGitHead;
