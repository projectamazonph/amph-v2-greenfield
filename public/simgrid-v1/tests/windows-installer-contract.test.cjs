const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Windows desktop package has a runnable Electron entrypoint', () => {
  const packageJson = JSON.parse(read('package.json'));
  const main = packageJson.main;

  assert.equal(main, 'desktop/main.cjs');
  assert.ok(fs.existsSync(path.join(root, main)));
  assert.match(read(main), /\.loadFile\(START_PAGE\)/);
  assert.match(read(main), /dialog\.showErrorBox/);
});

test('Every module required by the Electron main process ships in the installer', () => {
  const packageJson = JSON.parse(read('package.json'));
  const main = read(packageJson.main);
  const runtimeDeps = packageJson.dependencies || {};
  const devDeps = packageJson.devDependencies || {};

  // Bare-specifier requires in main.cjs must resolve inside app.asar, so they
  // must be production dependencies (devDependencies are pruned at pack time).
  // 'electron' itself is exempt: the runtime provides it.
  const required = [...main.matchAll(/require\('([^'./][^']*)'\)/g)].map((m) => m[1]);
  assert.ok(required.length > 0, 'expected at least one bare-specifier require in main process');
  for (const name of required) {
    if (name === 'electron' || name.startsWith('node:')) continue;
    assert.ok(runtimeDeps[name], `${name} must be a runtime dependency to ship in app.asar`);
    assert.ok(!devDeps[name], `${name} must not be left in devDependencies (pruned at pack time)`);
  }
});

test('Windows packaging includes every runtime directory used by the app', () => {
  const packageJson = JSON.parse(read('package.json'));
  const files = packageJson.build.files;

  for (const requiredPattern of ['index.html', '*.html', 'assets/**/*', 'learn/**/*', 'coach-decks/**/*', 'downloads/**/*', 'desktop/main.cjs', 'package.json']) {
    assert.ok(files.includes(requiredPattern), `build.files must include ${requiredPattern}`);
  }
  assert.equal(packageJson.build.win.target[0].target, 'nsis');
  assert.equal(packageJson.build.win.target[0].arch[0], 'x64');
  assert.equal(packageJson.build.nsis.runAfterFinish, true);
  assert.equal(packageJson.author, 'Project Amazon PH Academy');
  assert.equal(packageJson.build.nsis.menuCategory, 'Project Amazon PH Academy');
  assert.equal(packageJson.build.nsis.license, 'build/installer-info.txt');
  assert.ok(fs.existsSync(path.join(root, 'build/installer-info.txt')));
});

test('packaged Windows builds have a GitHub Releases update source', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.deepEqual(packageJson.build.publish, {
    provider: 'github',
    owner: 'projectamazonph',
    repo: 'amazon-ph-simulators',
    releaseType: 'release'
  });
  assert.match(read('desktop/main.cjs'), /autoUpdater\.checkForUpdates\(\)/);
  assert.match(read('desktop/main.cjs'), /autoUpdater\.quitAndInstall\(\)/);
});

test('desktop app keeps browser storage in a stable per-user data directory', () => {
  const main = read('desktop/main.cjs');

  assert.match(main, /app\.getPath\('appData'\)/);
  assert.match(main, /app\.setPath\('userData', USER_DATA_DIR\)/);
  assert.match(main, /outside the install/);
});
