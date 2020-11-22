const core = require('@actions/core');
const exec = require('@actions/exec');
const tc = require('@actions/tool-cache');
const { Octokit } = require("@octokit/rest");
import * as path from 'path'

const baseDownloadURL = "https://github.com/renehernandez/appfile/releases/download"
const fallbackVersion = "0.0.1"
const octokit = new Octokit();

/**
 * Gets RUNNER_TEMP
 */
function _getTempDirectory() {
    const tempDirectory = process.env['RUNNER_TEMP'] || ''
    ok(tempDirectory, 'Expected RUNNER_TEMP to be defined')
    return tempDirectory
  }

async function downloadAppfile(version) {
    if (process.platform === 'win32') {
        const appfileDownload = await tc.downloadTool(`${baseDownloadURL}/v${version}/appfile_windows_amd64.exe`);
        return path.dirname(appfileDownload);
    }
    if (process.platform === 'darwin') {
        const appfileDownload = await tc.downloadTool(`${baseDownloadURL}/v${version}/appfile_darwin_amd64`);
        return path.dirname(appfileDownload);
    }
    const appfileDownload = await tc.downloadTool(`${baseDownloadURL}/v${version}/appfile_linux_amd64`);
    return path.dirname(appfileDownload);
}

async function run() {
    try {
        var version = core.getInput('version');
        if ((!version) || (version.toLowerCase() === 'latest')) {
            version = await octokit.repos.getLatestRelease({
                owner: 'renehernandez',
                repo: 'appfile'
            }).then(result => {
                return result.data.name;
            }).catch(error => {
                // GitHub rate-limits are by IP address and runners can share IPs.
                // This mostly effects macOS where the pool of runners seems limited.
                // Fallback to a known version if API access is rate limited.
                core.warning(`${error.message}
    Failed to retrieve latest version; falling back to: ${fallbackVersion}`);
                return fallbackVersion;
            });
        }
        if (version.charAt(0) === 'v') {
            version = version.substr(1);
        }
        core.info(`>>> Version to use: ${version}`);

        var path = tc.find("appfile", version);
        if (!path) {
            const installPath = await downloadAppfile(version);
            path = await tc.cacheDir(installPath, 'appfile', version);
        }
        core.addPath(path);
        core.info(`>>> appfile version v${version} installed to ${path}`);
        await exec.exec('appfile --help');
        core.info('>>> Successfully executed help for appfile');
    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run();