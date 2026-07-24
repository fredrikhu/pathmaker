param(
    [Parameter(Mandatory = $true)]
    [string]$Hostname,
    [Parameter(Mandatory = $false)]
    [string]$Username = "root"
)

npm run build
# Don't wipe the server if the build failed — that would replace the site with nothing.
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed; aborting deploy."; exit 1 }

ssh "${Username}@${Hostname}" 'rm -rf /var/www/pathmaker/*'
scp -r dist/* "${Username}@${Hostname}:/var/www/pathmaker/"
ssh "${Username}@${Hostname}" 'chmod -R a+rX /var/www/pathmaker'
