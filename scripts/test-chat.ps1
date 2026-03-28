param(
  [string]$Message = "ping from powershell",
  [string]$Model = "default",
  [string]$Provider = "provider-a",
  [int]$TimeoutMs = 15000,
  [string]$Url = "http://127.0.0.1:3000/chat"
)

$ErrorActionPreference = "Stop"

# Force UTF-8 in current session to avoid mojibake on GBK code pages.
chcp 65001 | Out-Null
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

$payload = @{
  provider = $Provider
  model = $Model
  timeoutMs = $TimeoutMs
  messages = @(
    @{
      role = "user"
      content = $Message
    }
  )
} | ConvertTo-Json -Depth 10

Write-Host "POST $Url"
Write-Host "Message: $Message"

$response = Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json; charset=utf-8" -Body $payload

Write-Host "Response:"
$response | ConvertTo-Json -Depth 10
