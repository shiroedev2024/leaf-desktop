/* eslint-env node */
/* global process */
import { execSync } from 'child_process';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  copyFileSync,
} from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import archiver from 'archiver';
import axios from 'axios';
import FormData from 'form-data';
import glob from 'glob';

config();

const PROJECT_ROOT = process.cwd();
const RELEASE_DIR = join(PROJECT_ROOT, 'release');
const TAURI_CONF_PATH = join(PROJECT_ROOT, 'src-tauri', 'tauri.conf.json');

function validateEnvironmentVariables() {
  if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
    throw new Error('TAURI_SIGNING_PRIVATE_KEY is not set');
  }
  if (!process.env.CARGO_REGISTRIES_KELLNR_TOKEN) {
    throw new Error('CARGO_REGISTRIES_KELLNR_TOKEN is not set');
  }
  if (parsePublishFlag()) {
    validatePublishEnvironmentVariables();
  }
}

function validatePublishEnvironmentVariables() {
  if (!process.env.UPLOAD_API_URL) {
    throw new Error('UPLOAD_API_URL is not set (required for publishing)');
  }
  if (!process.env.UPLOAD_API_KEY) {
    throw new Error('UPLOAD_API_KEY is not set (required for publishing)');
  }
}

function parsePublishFlag() {
  const args = process.argv.slice(2);
  return args.includes('--publish');
}

function readReleaseNotes() {
  const releaseNotesPath = join(PROJECT_ROOT, 'release_note.txt');
  if (!existsSync(releaseNotesPath)) {
    console.warn('release_note.txt not found, using default changelog');
    return 'Bug fixes and improvements';
  }
  return readFileSync(releaseNotesPath, 'utf-8').trim();
}

function getTauriConfigValue(key) {
  const tauriConfString = readFileSync(TAURI_CONF_PATH, 'utf-8');
  const tauriConf = JSON.parse(tauriConfString);
  return tauriConf[key];
}

// Returns the default host target triple for rustc (e.g., "x86_64-unknown-linux-gnu")
function getDefaultTarget() {
  try {
    return execSync('rustc -vV')
      .toString()
      .split('\n')
      .find((line) => line.startsWith('host:'))
      .split(':')[1]
      .trim();
  } catch (err) {
    throw new Error(`Failed to get default rustc target: ${err}`);
  }
}

function getPlatformFromTarget(target) {
  const platforms = {
    'x86_64-apple-darwin': 'macos',
    'aarch64-apple-darwin': 'macos',
    'x86_64-unknown-linux-gnu': 'linux',
    'aarch64-unknown-linux-gnu': 'linux',
    'armv7-unknown-linux-gnueabihf': 'linux',
    'i686-unknown-linux-gnu': 'linux',
    'x86_64-unknown-linux-musl': 'linux',
    'i686-pc-windows-msvc': 'windows',
    'x86_64-pc-windows-msvc': 'windows',
    'aarch64-pc-windows-msvc': 'windows',
  };
  return platforms[target] || 'unknown';
}

// Map rust target triples to simple arch names used in zip filenames
function getSimpleArchFromTarget(target) {
  if (!target || typeof target !== 'string') return 'unknown';
  if (target.includes('x86_64')) return 'x64';
  if (target.includes('i686') || target.includes('i386')) return 'x86';
  if (target.includes('aarch64')) return 'arm64';
  if (target.includes('armv7')) return 'arm32';
  return 'unknown';
}

function findAndCopyArtifact(baseDir, expectedName, safeDestName, version) {
  const primarySrc = join(baseDir, expectedName);
  if (existsSync(primarySrc)) {
    console.log(`Found primary artifact: ${primarySrc}`);
    return primarySrc;
  }

  console.log(
    `Primary src missing (${primarySrc}); searching for sanitized variant...`
  );
  const patterns = [
    join(baseDir, `*${version}*`),
    join(baseDir, `Leaf*.${version}*`),
    join(baseDir, `Leaf*${version}*`),
  ];
  let found = null;
  for (const pattern of patterns) {
    const matches = glob.sync(pattern);
    if (matches.length > 0) {
      found = matches[0];
      console.log(
        `Found sanitized: ${found} → copying to safe: ${safeDestName}`
      );
      const safePath = join(baseDir, safeDestName);
      copyFileSync(found, safePath);
      return safePath;
    }
  }
  console.warn(`No artifact found for ${expectedName}; skipping.`);
  return null;
}

function buildForTarget(target) {
  console.log(`Building for target: ${target}`);

  const command = `yarn tauri build --target ${target}`;
  execSync(command, { stdio: 'inherit' });
}

function createZip(files, zipFileName) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(join(RELEASE_DIR, zipFileName));
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(
        `Zip file ${zipFileName} created successfully! (${archive.pointer()} bytes)`
      );
      resolve();
    });

    output.on('error', (error) => {
      console.error(`Error writing zip file: ${error}`);
      reject(error);
    });

    archive.on('error', (error) => {
      console.error(`Error during archiving: ${error}`);
      reject(error);
    });

    archive.pipe(output);

    let addedAny = false;
    for (const file of files) {
      if (!file.src || !existsSync(file.src)) {
        console.warn(`Skipping missing artifact: ${file.src || 'unknown'}`);
        continue;
      }
      archive.file(file.src, { name: file.dest });
      addedAny = true;
    }

    if (!addedAny) {
      console.warn(
        `No existing artifacts found for ${zipFileName}; skipping zip creation.`
      );
      resolve();
      return;
    }

    archive.finalize().catch((error) => {
      console.error(`Error finalizing zip process: ${error}`);
      reject(error);
    });
  });
}

async function uploadRelease(zipPath, platform, version) {
  const uploadUrl = process.env.UPLOAD_API_URL;
  const apiKey = process.env.UPLOAD_API_KEY;

  if (!uploadUrl || !apiKey) {
    throw new Error(
      'UPLOAD_API_URL and UPLOAD_API_KEY must be set for publishing'
    );
  }

  const changeLog = readReleaseNotes();

  const formData = new FormData();
  formData.append('zip', createReadStream(zipPath));
  formData.append('platform', platform);
  formData.append('version', version);
  formData.append('source', 'direct');
  formData.append('change_log[0][lang_code]', 'en');
  formData.append('change_log[0][text]', changeLog);

  try {
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        'X-API-Key': apiKey,
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (response.data.success) {
      console.log(`Successfully uploaded ${platform} release ${version}`);
      console.log(`   Message: ${response.data.message}`);
      console.log(
        `   Variants processed: ${response.data.data.variantsProcessed}`
      );
    } else {
      throw new Error(
        `Upload failed: ${response.data.message || 'Unknown error'}`
      );
    }
  } catch (error) {
    console.error(`Failed to upload ${platform} release: ${error.message}`);

    // Print detailed error response if available
    if (error.response) {
      console.error('\n=== DETAILED ERROR RESPONSE ===');
      console.error(
        `Status: ${error.response.status} ${error.response.statusText}`
      );
      console.error(`Headers:`, error.response.headers);

      if (error.response.data) {
        console.error('Response Body:');
        console.error(JSON.stringify(error.response.data, null, 2));
      }

      console.error('=== END ERROR RESPONSE ===\n');
    } else if (error.request) {
      console.error('\n=== NETWORK ERROR ===');
      console.error('No response received from server');
      console.error('Request details:', error.request);
      console.error('=== END NETWORK ERROR ===\n');
    } else {
      console.error('\n=== REQUEST SETUP ERROR ===');
      console.error('Error setting up request:', error);
      console.error('=== END REQUEST SETUP ERROR ===\n');
    }

    throw error;
  }
}

function parseTargetsFromArgs() {
  const args = process.argv.slice(2);
  const targets = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--target=')) {
      const val = arg.split('=')[1];
      if (val) targets.push(val);
    } else if (arg === '--target' || arg === '-t') {
      const val = args[i + 1];
      if (val && !val.startsWith('-')) {
        targets.push(val);
        i++; // skip the value
      } else {
        throw new Error('Missing value for --target');
      }
    }
  }
  return targets;
}

async function main() {
  validateEnvironmentVariables();

  const version = getTauriConfigValue('version');
  const productName = getTauriConfigValue('productName');
  const safeProductName = productName
    .replace(/\s+/g, '_')
    .replace(/[^\w\-.]/g, '');

  const parsedTargets = parseTargetsFromArgs();
  const targets = parsedTargets.length ? parsedTargets : [getDefaultTarget()];
  console.log(`Using targets: ${targets.join(', ')}`);

  mkdirSync(RELEASE_DIR, { recursive: true });

  const platformToTargets = {};
  for (const target of targets) {
    const platform = getPlatformFromTarget(target);
    if (platform === 'unknown') {
      console.warn(`Skipping unsupported target: ${target}`);
      continue;
    }
    if (!platformToTargets[platform]) platformToTargets[platform] = [];
    platformToTargets[platform].push(target);
  }

  const shouldPublish = parsePublishFlag();
  if (shouldPublish) {
    console.log('Publishing enabled - releases will be uploaded after build');
  }

  const createdZips = [];

  for (const platform of Object.keys(platformToTargets)) {
    const platformTargets = platformToTargets[platform];
    const files = [];
    let zipFileBase = '';
    const archSet = new Set();

    for (const target of platformTargets) {
      const simpleArch = getSimpleArchFromTarget(target);
      archSet.add(simpleArch);

      console.log(
        `\n=== Building target ${target} for platform ${platform} ===`
      );
      buildForTarget(target);

      switch (platform) {
        case 'macos': {
          const macPrefix = getSimpleArchFromTarget(target);
          const expectedTarGz = `${productName}.app.tar.gz`;
          const expectedSig = `${productName}.app.tar.gz.sig`;
          const safeTarGz = `${safeProductName}_${version}_${macPrefix}.app.tar.gz`;
          const safeSig = `${safeProductName}_${version}_${macPrefix}.app.tar.gz.sig`;

          const macBundleDir = join(
            PROJECT_ROOT,
            'src-tauri',
            'target',
            target,
            'release',
            'bundle',
            'macos'
          );
          const tarGzSrc = findAndCopyArtifact(
            macBundleDir,
            expectedTarGz,
            safeTarGz,
            version
          );
          const sigSrc = findAndCopyArtifact(
            macBundleDir,
            expectedSig,
            safeSig,
            version
          );

          if (tarGzSrc) files.push({ src: tarGzSrc, dest: safeTarGz });
          if (sigSrc) files.push({ src: sigSrc, dest: safeSig });

          zipFileBase = `leaf-vpn-macos-${version}`;
          break;
        }
        case 'linux': {
          let debPrefix;
          let rpmPrefix;

          if (target.includes('x86_64')) {
            debPrefix = 'amd64';
            rpmPrefix = '1.x86_64';
          } else if (target.includes('aarch64')) {
            debPrefix = 'arm64';
            rpmPrefix = '1.aarch64';
          } else if (target.includes('i686')) {
            debPrefix = 'i386';
            rpmPrefix = '1.i686';
          } else if (target.includes('armv7')) {
            debPrefix = 'armhf';
            rpmPrefix = '1.armhfp';
          } else {
            debPrefix = 'i386';
            rpmPrefix = '1.i686';
          }

          const expectedDeb = `${productName}_${version}_${debPrefix}.deb`;
          const expectedDebSig = `${productName}_${version}_${debPrefix}.deb.sig`;
          const expectedRpm = `${productName}-${version}-${rpmPrefix}.rpm`;
          const expectedRpmSig = `${productName}-${version}-${rpmPrefix}.rpm.sig`;

          const safeDeb = `${safeProductName}_${version}_${debPrefix}.deb`;
          const safeDebSig = `${safeProductName}_${version}_${debPrefix}.deb.sig`;
          const safeRpm = `${safeProductName}-${version}-${rpmPrefix}.rpm`;
          const safeRpmSig = `${safeProductName}-${version}-${rpmPrefix}.rpm.sig`;

          const debDir = join(
            PROJECT_ROOT,
            'src-tauri',
            'target',
            target,
            'release',
            'bundle',
            'deb'
          );
          const rpmDir = join(
            PROJECT_ROOT,
            'src-tauri',
            'target',
            target,
            'release',
            'bundle',
            'rpm'
          );

          const debSrc = findAndCopyArtifact(
            debDir,
            expectedDeb,
            safeDeb,
            version
          );
          const debSigSrc = findAndCopyArtifact(
            debDir,
            expectedDebSig,
            safeDebSig,
            version
          );
          const rpmSrc = findAndCopyArtifact(
            rpmDir,
            expectedRpm,
            safeRpm,
            version
          );
          const rpmSigSrc = findAndCopyArtifact(
            rpmDir,
            expectedRpmSig,
            safeRpmSig,
            version
          );

          if (debSrc) files.push({ src: debSrc, dest: safeDeb });
          if (debSigSrc) files.push({ src: debSigSrc, dest: safeDebSig });
          if (rpmSrc) files.push({ src: rpmSrc, dest: safeRpm });
          if (rpmSigSrc) files.push({ src: rpmSigSrc, dest: safeRpmSig });

          zipFileBase = `leaf-vpn-linux-${version}`;
          break;
        }
        case 'windows': {
          let winPrefix;
          if (target.includes('x86_64')) {
            winPrefix = 'x64';
          } else if (target.includes('i686')) {
            winPrefix = 'x86';
          } else if (target.includes('aarch64')) {
            winPrefix = 'arm64';
          } else {
            winPrefix = 'unknown';
          }

          const nsisDir = join(
            PROJECT_ROOT,
            'src-tauri',
            'target',
            target,
            'release',
            'bundle',
            'nsis'
          );

          const expectedExe = `${productName}_${version}_${winPrefix}-setup.exe`;
          const expectedSig = `${expectedExe}.sig`;
          const safeExe = `${safeProductName}_${version}_${winPrefix}-setup.exe`;
          const safeSig = `${safeExe}.sig`;

          const exeSrc = findAndCopyArtifact(
            nsisDir,
            expectedExe,
            safeExe,
            version
          );
          const sigSrc = findAndCopyArtifact(
            nsisDir,
            expectedSig,
            safeSig,
            version
          );

          if (exeSrc) files.push({ src: exeSrc, dest: safeExe });
          if (sigSrc) files.push({ src: sigSrc, dest: safeSig });

          zipFileBase = `leaf-vpn-windows-${version}`;
          break;
        }
        default:
          console.warn(`Unsupported platform for target ${target}, skipping.`);
          break;
      }
    }

    if (files.length > 0 && zipFileBase) {
      const archArray = Array.from(archSet).filter((a) => a && a !== 'unknown');
      const archSuffix = archArray.length ? `_${archArray.join('_')}` : '';
      const zipFileName = `${zipFileBase}${archSuffix}.zip`;
      const seen = new Set();
      const uniqueFiles = [];
      for (const f of files) {
        if (f.src && !seen.has(f.dest)) {
          uniqueFiles.push(f);
          seen.add(f.dest);
        }
      }
      await createZip(uniqueFiles, zipFileName);

      createdZips.push({
        path: join(RELEASE_DIR, zipFileName),
        platform: platform,
        version: version,
      });
    } else {
      console.warn(
        `No files collected for platform ${platform}, skipping zip.`
      );
    }
  }

  if (shouldPublish && createdZips.length > 0) {
    console.log('\nStarting release publishing...');
    for (const zipInfo of createdZips) {
      try {
        await uploadRelease(zipInfo.path, zipInfo.platform, zipInfo.version);
      } catch (error) {
        console.error(
          `Failed to publish ${zipInfo.platform} release: ${error.message}`
        );
        process.exit(1);
      }
    }
    console.log('All releases published successfully!');
  }

  console.log('Build process completed successfully!');
}

main().catch((error) => {
  console.error('Build failed:', error.message);
  process.exit(1);
});
