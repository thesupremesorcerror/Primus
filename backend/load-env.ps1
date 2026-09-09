# Loads variables from a .env file in the repo root into the current
# PowerShell session, so you don't have to type $env:GEMINI_API_KEY = "..."
# every time you run `.\mvnw.cmd spring-boot:run` directly (outside Docker).
#
# Usage (from repo root or backend/):
#   . .\load-env.ps1
#
# Note the leading ". " (dot-source) -- this is required so the variables
# persist in your current shell rather than a child process.

$envFile = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path $envFile)) {
    $envFile = Join-Path $PSScriptRoot ".env"
}

if (-not (Test-Path $envFile)) {
    Write-Host "No .env file found. Copy .env.example to .env and fill in real values first." -ForegroundColor Yellow
    return
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Length -eq 2) {
            $name = $parts[0].Trim()
            $value = $parts[1].Trim()
            Set-Item -Path "env:$name" -Value $value
            Write-Host "Set `$env:$name" -ForegroundColor DarkGray
        }
    }
}

Write-Host "Environment variables loaded from $envFile" -ForegroundColor Green
