param(
  [switch]$SkipDocker,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Set-Location $root

if (-not (Test-Path "server\.env")) {
  Copy-Item "server\.env.example" "server\.env"
  Write-Host "Created server\.env from server\.env.example. Update OAuth values before prod."
}

if (-not $SkipDocker) {
  if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker compose up -d
  } else {
    Write-Warning "Docker not found. Ensure PostgreSQL is running."
  }
}

if (-not $SkipInstall) {
  Push-Location "server"
  npm install
  Pop-Location

  Push-Location "client"
  npm install
  Pop-Location
}

Push-Location "client"
npm run build
Pop-Location

Write-Host "Client build output is in client\dist. Host it with your static server."

Push-Location "server"
$env:NODE_ENV = "production"
npm run start
Pop-Location
