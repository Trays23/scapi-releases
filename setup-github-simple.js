#!/usr/bin/env node
const https = require('https');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = '178c6fc778ccc68e1d6a';
const SCOPES = 'repo,read:user,user:email';

function post(hostname, p, params) {
    return new Promise((res, rej) => {
        const body = new URLSearchParams(params).toString();
        const req = https.request({
            method: 'POST', hostname, path: p,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'SCAPI/1.0',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)) } catch { res(d) } }); });
        req.on('error', rej);
        req.write(body);
        req.end();
    });
}

function api(method, p, data, token) {
    return new Promise((res, rej) => {
        const body = data ? JSON.stringify(data) : null;
        const req = https.request({
            method, hostname: 'api.github.com', path: p,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'SCAPI/1.0',
                'Authorization': `Bearer ${token}`,
                ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
            },
        }, (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)) } catch { res(d) } }); });
        req.on('error', rej);
        if (body) req.write(body);
        req.end();
    });
}

function git(cmd, cwd) {
    try { return execSync(`git ${cmd}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(); }
    catch (e) { return null; }
}

function openBrowser(url) {
    exec(process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`, () => { });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const cwd = process.cwd();
    console.log('Connecting to GitHub...');
    const d = await post('github.com', '/login/device/code', { client_id: CLIENT_ID, scope: SCOPES });

    if (!d.device_code) {
        console.error('ERROR: Could not reach GitHub:', JSON.stringify(d));
        process.exit(1);
    }

    console.log('\n\n################################################');
    console.log('###                                          ###');
    console.log(`###   YOUR CODE IS:    ${d.user_code}          ###`);
    console.log('###                                          ###');
    console.log('################################################\n\n');
    console.log(`Open: ${d.verification_uri}`);
    console.log(`Code: ${d.user_code}\n`);

    openBrowser(d.verification_uri);
    console.log('Waiting for authorization (the script will proceed automatically once you authorize in the browser)...\n');

    let token = null;
    let interval = (d.interval || 5) * 1000;
    const deadline = Date.now() + d.expires_in * 1000;

    while (Date.now() < deadline) {
        await sleep(interval);
        const r = await post('github.com', '/login/oauth/access_token', {
            client_id: CLIENT_ID, device_code: d.device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        });
        if (r.access_token) { token = r.access_token; break; }
        if (r.error === 'slow_down') interval += 5000;
        process.stdout.write('.');
    }

    if (!token) { console.log('\nERROR: Timeout.'); process.exit(1); }
    console.log('\nAuthorized! Setting up repo...');

    const user = await api('GET', '/user', null, token);
    const username = user.login;
    const email = user.email || `${username}@users.noreply.github.com`;

    const REPO = 'scapi-releases';
    const check = await api('GET', `/repos/${username}/${REPO}`, null, token);
    let repoUrl;
    if (check.clone_url) {
        repoUrl = check.clone_url;
    } else {
        const created = await api('POST', '/user/repos', {
            name: REPO,
            description: 'SCAPI product catalog releases',
            private: false,
            auto_init: true,
        }, token);
        repoUrl = created.clone_url;
    }

    const authUrl = repoUrl.replace('https://', `https://${username}:${token}@`);
    if (!git('rev-parse --git-dir', cwd)) git('init -b main', cwd);
    git(`config user.email "${email}"`, cwd);
    git(`config user.name "${username}"`, cwd);

    const gitignore = path.join(cwd, '.gitignore');
    if (!fs.existsSync(gitignore)) {
        fs.writeFileSync(gitignore, 'node_modules/\ndist/\nrelease/\n.env*\n*.log\n');
    }

    git('add -A', cwd);
    const status = git('status --porcelain', cwd);
    if (status) git('commit -m "Update from SCAPI"', cwd);

    const existing = git('remote get-url origin', cwd);
    if (existing) git(`remote set-url origin "${authUrl}"`, cwd);
    else git(`remote add origin "${authUrl}"`, cwd);

    git('push -u origin main --force', cwd);

    fs.writeFileSync(path.join(cwd, '.env.github'), `GH_TOKEN=${token}\nGITHUB_USERNAME=${username}\nGITHUB_REPO=${REPO}\n`);

    const pkgPath = path.join(cwd, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.build.publish = {
        provider: "github",
        owner: username,
        repo: REPO,
        releaseType: "release"
    };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    console.log('\nSUCCESS! Repository is set up and code is pushed.');
    console.log(`URL: https://github.com/${username}/${REPO}`);
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
