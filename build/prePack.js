const fs = require('fs');
const { join } = require('path');

console.info('  • Updating permissions for binaries');

const updatePermissions = () => {
  const directoryPath = join(__dirname, '../resources/bin');

  fs.chmodSync(join(directoryPath, 'mp4-merge-mac-arm64'), 0o755);
  fs.chmodSync(join(directoryPath, 'mp4-merge-mac-x64'), 0o755);
  fs.chmodSync(join(directoryPath, 'udtacopy-mac'), 0o755);

  console.info('  • Permissions updated');
};

module.exports = updatePermissions;
