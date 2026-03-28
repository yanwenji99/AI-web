$ErrorActionPreference = "Stop"

Write-Host "1) Set Provider A to web mode with headed browser"
$env:PROVIDER_A_MODE = "web"
$env:PROVIDER_A_HEADLESS = "false"

Write-Host "2) Configure target URL (replace before running if needed)"
if (-not $env:PROVIDER_A_URL) {
	$env:PROVIDER_A_URL = "https://example.com"
}
Write-Host "PROVIDER_A_URL=$($env:PROVIDER_A_URL)"

Write-Host "3) Start server in another terminal: npm run dev"
Write-Host "4) Trigger one request to open page and complete login manually"
Write-Host "   npm run chat:ping"
Write-Host "5) Run 10-request verification"
Write-Host "   npm run verify:provider-a:web"
