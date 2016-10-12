"use strict";

function fieldsToVersion(versionFields) {
  return versionFields[0] + "." + versionFields[1] + "." + versionFields[2] + (
      versionFields[3] ? "-" + versionFields[3] : ""
    );
}

exports.calculateCurrentPublished = function calculateCurrentPublished(version, publishedVersions) {
  var publishedVersionsOfMinorBranch = findPublishedVersionsOfMinorBranch(
    publishedVersions, majorMinorVersionOf(version));

  var currentPatchVersion =
    publishedVersionsOfMinorBranch.length > 0 ?
    (patchVersionOf(publishedVersionsOfMinorBranch[publishedVersionsOfMinorBranch.length - 1]) || 0) :
      (patchVersionOf(version) || 0);

  var versionFields = version.split(/[\.\-]/);

  versionFields[1] = (versionFields[1] || 0);
  versionFields[2] = Math.max(patchVersionOf(version), currentPatchVersion);

  var currentVersion = fieldsToVersion(versionFields);
  return publishedVersions.indexOf(currentVersion) > -1 && currentVersion;
};

exports.calculateNextVersionPackage = function calculateNextVersionPackage(version, publishedVersions) {
  var publishedVersionsOfMinorBranch = findPublishedVersionsOfMinorBranch(
    publishedVersions, majorMinorVersionOf(version));

  var nextPatchVersion =
    publishedVersionsOfMinorBranch.length > 0 ?
      (patchVersionOf(publishedVersionsOfMinorBranch[publishedVersionsOfMinorBranch.length - 1]) || 0) + 1 :
      (patchVersionOf(version) || 0);

  var versionFields = version.split(/[\.\-]/);

  versionFields[1] = (versionFields[1] || 0);
  versionFields[2] = Math.max(patchVersionOf(version), nextPatchVersion);

  return fieldsToVersion(versionFields);
};

function findPublishedVersionsOfMinorBranch(publishedVersions, minorVersion) {
  return publishedVersions.filter(
    function(publishedVersion) {return majorMinorVersionOf(publishedVersion) === minorVersion});
}

function majorMinorVersionOf(version) {
  var versionFields = version.split(/[\.\-]/);

  if (versionFields.length >= 1)
    return take(versionFields, Math.min(versionFields.length, 2)).join('.');
  else
    return undefined;
}

function patchVersionOf(version) {
  var versionFields = version.split(/[\.\-]/);

  if (versionFields.length >= 2)
    return parseInt(versionFields[2]);
  else
    return undefined;
}

function take(array, lengthToTake) {
  var ret = [];

  for (var i = 0; i < Math.min(array.length, lengthToTake); ++i)
    ret.push(array[i]);

  return ret;
}
