param(
    [Parameter(Mandatory = $true)]
    [string]$Hostname,
    [Parameter(Mandatory = $false)]
    [string]$Username = "root",
    # The API changes far less often than the app. Skip it to push only the static build.
    [switch]$SkipApi
)

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

ssh "${Username}@${Hostname}" 'rm -rf /var/www/pathmaker/*'
scp -r dist/* "${Username}@${Hostname}:/var/www/pathmaker/"
ssh "${Username}@${Hostname}" 'chmod -R a+rX /var/www/pathmaker'

if (-not $SkipApi) {
    # The service keeps running on the old code until the restart, so a half-copied dist is never
    # what's being served.
    ssh "${Username}@${Hostname}" 'mkdir -p /opt/pathmaker-api/dist.new'
    scp -r server/dist/* "${Username}@${Hostname}:/opt/pathmaker-api/dist.new/"
    scp server/package.json server/package-lock.json "${Username}@${Hostname}:/opt/pathmaker-api/"
    ssh "${Username}@${Hostname}" @'
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
    ssh "${Username}@${Hostname}" 'curl -fsS http://127.0.0.1:8787/api/health'
    if ($LASTEXITCODE -ne 0) {
        Write-Error "API restarted but is not healthy — check: journalctl -u pathmaker-api -n 50"
        exit 1
    }
    Write-Host "`nAPI healthy." -ForegroundColor Green
}
