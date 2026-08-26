param(
    [Parameter(Mandatory = $true)]
    [string]$Hostname,
    [Parameter(Mandatory = $false)]
    [string]$Username = "root",
    # The API changes far less often than the app. Skip it to push only the static build.
    [switch]$SkipApi
)

# -n keeps ssh from reading the console's stdin (a scripted run otherwise hangs waiting on it),
# and BatchMode turns a credential or host-key prompt into an immediate failure rather than a
# silent wait. ConnectTimeout bounds an unreachable host.
$SshArgs = @('-n', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15')
$ScpArgs = @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15')

npm run build
# Don't wipe the server if the build failed — that would replace the site with nothing.
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed; aborting deploy."; exit 1 }

if (-not $SkipApi) {
    Push-Location server
    npm run build
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "API build failed; aborting deploy."; exit 1 }
    npm test
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "API tests failed; aborting deploy."; exit 1 }
    Pop-Location
}

# The web root is emptied only once the new build is known to be ready to copy, so an aborted
# deploy cannot leave the site as a bare index.html with no assets.
ssh @SshArgs "${Username}@${Hostname}" 'rm -rf /var/www/pathmaker.new && mkdir -p /var/www/pathmaker.new'
if ($LASTEXITCODE -ne 0) { Write-Error "Could not reach ${Hostname} over ssh."; exit 1 }
scp @ScpArgs -r dist/* "${Username}@${Hostname}:/var/www/pathmaker.new/"
if ($LASTEXITCODE -ne 0) { Write-Error "Copying the site failed; the live site is untouched."; exit 1 }
ssh @SshArgs "${Username}@${Hostname}" @'
set -e
rm -rf /var/www/pathmaker.old
if [ -d /var/www/pathmaker ]; then mv /var/www/pathmaker /var/www/pathmaker.old; fi
mv /var/www/pathmaker.new /var/www/pathmaker
chmod -R a+rX /var/www/pathmaker
rm -rf /var/www/pathmaker.old
'@
if ($LASTEXITCODE -ne 0) { Write-Error "Swapping the new site into place failed."; exit 1 }

if (-not $SkipApi) {
    # The service keeps running on the old code until the restart, so a half-copied dist is never
    # what's being served.
    ssh @SshArgs "${Username}@${Hostname}" 'rm -rf /opt/pathmaker-api/dist.new && mkdir -p /opt/pathmaker-api/dist.new'
    scp @ScpArgs -r server/dist/* "${Username}@${Hostname}:/opt/pathmaker-api/dist.new/"
    if ($LASTEXITCODE -ne 0) { Write-Error "Copying the API failed; the running service is untouched."; exit 1 }
    scp @ScpArgs server/package.json server/package-lock.json "${Username}@${Hostname}:/opt/pathmaker-api/"
    ssh @SshArgs "${Username}@${Hostname}" @'
set -e
cd /opt/pathmaker-api
rm -rf dist.old
if [ -d dist ]; then mv dist dist.old; fi
mv dist.new dist
npm ci --omit=dev
chown -R pathmaker:pathmaker /opt/pathmaker-api
systemctl restart pathmaker-api
'@
    if ($LASTEXITCODE -ne 0) { Write-Error "API deploy failed."; exit 1 }

    # Prove the restarted service is actually answering before calling the deploy done.
    Start-Sleep -Seconds 2
    ssh @SshArgs "${Username}@${Hostname}" 'curl -fsS http://127.0.0.1:8787/api/health'
    if ($LASTEXITCODE -ne 0) {
        Write-Error "API restarted but is not healthy — check: journalctl -u pathmaker-api -n 50"
        exit 1
    }
    Write-Host "`nAPI healthy." -ForegroundColor Green
}
