param(
  [int]$Count = 10,
  [string]$Url = "http://127.0.0.1:3000/chat",
  [string]$Model = "default",
  [int]$TimeoutMs = 30000,
  [int]$DelayMs = 500
)

$ErrorActionPreference = "Stop"

$success = 0
$failed = 0
$results = @()

for ($i = 1; $i -le $Count; $i++) {
  $payload = @{
    provider = "provider-a"
    model = $Model
    timeoutMs = $TimeoutMs
    messages = @(
      @{
        role = "user"
        content = "web-check-$i"
      }
    )
  } | ConvertTo-Json -Depth 10

  try {
    $response = Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $payload

    if ($null -eq $response.error_code) {
      $success++
      $status = "success"
    }
    else {
      $failed++
      $status = "failed"
    }

    $results += [PSCustomObject]@{
      index = $i
      status = $status
      error_code = $response.error_code
      text = $response.text
    }
  }
  catch {
    $failed++
    $results += [PSCustomObject]@{
      index = $i
      status = "failed"
      error_code = "HTTP_ERROR"
      text = $_.Exception.Message
    }
  }

  Start-Sleep -Milliseconds $DelayMs
}

$rate = 0
if ($Count -gt 0) {
  $rate = [Math]::Round(($success * 100.0) / $Count, 2)
}

Write-Host "--- Provider A Web Verification ---"
Write-Host "Total:   $Count"
Write-Host "Success: $success"
Write-Host "Failed:  $failed"
Write-Host "Rate:    $rate%"
Write-Host ""
Write-Host "Details:"
$results | Format-Table -AutoSize | Out-String | Write-Host

if ($success -lt $Count) {
  exit 1
}
