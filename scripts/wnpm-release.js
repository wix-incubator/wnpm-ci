#!/usr/bin/env node
const shouldBumpMinor = process.argv.indexOf("--bump-minor") >= 0;

(async () => {
    await require('../index').prepareForRelease({shouldBumpMinor: shouldBumpMinor});
})()
