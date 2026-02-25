#!/usr/bin/env node
/**
 * SCAPI – GitHub Setup Script (v2 – clear code display)
 */

const https = require('https');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = '178c6fc778ccc68e1d6a'; // GitHub CLI OAuth App
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
    catch { return null; }
}

function openBrowser(url) {
    exec(process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`, () => { });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log('\n================================================');
    console.log('  SCAPI GitHub Setup');
    console.log('================================================\n');

    // Step 1: Device code
    console.log('[1] Verbinde mit GitHub...');
    const d = await post('github.com', '/login/device/code', { client_id: CLIENT_ID, scope: SCOPES });

    if (!d.device_code) {
        console.error('FEHLER: GitHub nicht erreichbar:', JSON.stringify(d));
        process.exit(1);
    }

    // ── CLEAR CODE DISPLAY ────────────────────────────────────────────────────
    console.log('\n================================================');
    console.log('');
    console.log('  SCHRITT: Browser auf github.com/login/device');
    console.log('');
    console.log('  Geben Sie diesen Code ein:');
    console.log('');
    console.log('  >>>>>  ' + d.user_code + '  <<<<<');
    console.log('');
    console.log('  URL: ' + d.verification_uri);
    console.log('');
    console.log('================================================\n');
    // ─────────────────────────────────────────────────────────────────────────

    openBrowser(d.verification_uri);
    console.log('[2] Browser geoeffnet. Warte auf Autorisierung...\n');

    // Step 2: Poll
    let token = null;
    let interval = (d.interval || 5) * 1000;
    const deadline = Date.now() + d.expires_in * 1000;

    while (Date.now() < deadline) {
        await sleep(interval);
        process.stdout.write('.');
        const r = await post('github.com', '/login/oauth/access_token', {
            client_id: CLIENT_ID, device_code: d.device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        });
        if (r.access_token) { token = r.access_token; break; }
        if (r.error === 'slow_down') interval += 5000;
        if (r.error === 'expired_token') { console.log('\nFEHLER: Code abgelaufen. Neu starten.'); process.exit(1); }
        if (r.error === 'access_denied') { console.log('\nFEHLER: Zugriff verweigert.'); process.exit(1); }
    }
    if (!token) { console.log('\nFEHLER: Timeout.'); process.exit(1); }
    console.log('\n\n[3] Authorisiert! Lade Profil...');

    // Step 3: User info
    const user = await api('GET', '/user', null, token);
    const username = user.login;
    const email = user.email || `${username}@users.noreply.github.com`;
    console.log('    Angemeldet als: ' + username);

    // Step 4: Create repo
    const REPO = 'scapi-releases';
    console.log(`[4] Repository "${REPO}" einrichten...`);

    const check = await api('GET', `/repos/${username}/${REPO}`, null, token);
    let repoUrl;
    if (check.clone_url) {
        console.log('    Repository existiert bereits - wird verwendet.');
        repoUrl = check.clone_url;
    } else {
        const created = await api('POST', '/user/repos', {
            name: REPO,
            description: 'SCAPI Produktkatalog – Releases & Auto-Updates',
            private: false,
            auto_init: true,
        }, token);
        if (!created.clone_url) { console.error('FEHLER beim Erstellen:', JSON.stringify(created)); process.exit(1); }
        repoUrl = created.clone_url;
        console.log('    Repository erstellt: github.com/' + username + '/' + REPO);
    }

    // Step 5: Git push
    console.log('[5] Code zu GitHub pushen...');
    const cwd = process.cwd();
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
    if (status) git('commit -m "SCAPI v1.0.0 – Erste Version"', cwd);

    const existing = git('remote get-url origin', cwd);
    if (existing) git(`remote set-url origin "${authUrl}"`, cwd);
    else git(`remote add origin "${authUrl}"`, cwd);

    const pushed = git('push -u origin main --force', cwd) ?? git('push -u origin HEAD:main --force', cwd);
    console.log('    Code erfolgreich gepusht!');

    // Step 6: Save config
    console.log('[6] Konfiguration speichern...');
    fs.writeFileSync(path.join(cwd, '.env.github'), `GH_TOKEN=${token}\nGITHUB_USERNAME=${username}\nGITHUB_REPO=${REPO}\n`);

    const pkgPath = path.join(cwd, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.build && pkg.build.publish) {
        pkg.build.publish.owner = username;
        pkg.build.publish.repo = REPO;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }
    console.log('    package.json aktualisiert.');

    // Done
    console.log('\n================================================');
    console.log('  FERTIG!');
    console.log('  Repository: https://github.com/' + username + '/' + REPO);
    console.log('');
    console.log('  Updates veroeffentlichen:');
    console.log('    npm run electron:publish');
    console.log('================================================\n');

    openBrowser(`https://github.com/${username}/${REPO}`);
}

main().catch(e => { console.error('\nFEHLER:', e.message); process.exit(1); });
