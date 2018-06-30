const fs = require('fs');
const path = require('path');
const {expect} = require('chai');
const {compare} = require('../lib/version-comparator');
const versionFetcher = require('../lib/version-fetcher');

describe('version-comparator', () => {
  it('should compare version with itself', () => {
    const cwd = versionFetcher.fetch('wnpm-ci', '6.2.0');
    expect(compare(cwd, '6.2.0')).to.equal(true);
  });

  it('should return false if we have difference', () => {
    const cwd = versionFetcher.fetch('wnpm-ci', '6.2.0');
    fs.writeFileSync(path.join(cwd, 'abc'), '111')
    expect(compare(cwd, '6.2.0')).to.equal(false);
  });
});
