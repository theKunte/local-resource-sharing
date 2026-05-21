# Database Restore Script
# Restores database from a backup file

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupFile,
    [switch]$Latest = $false
)

$ErrorActionPreference = "Stop"

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$dbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "appuser" }
$dbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "localresourcesharing" }

# Find backup file
if ($Latest) {
    $BackupFile = Get-ChildItem ".\backups" -Filter "backup_*.sql" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -First 1 -ExpandProperty FullName
    
    if (!$BackupFile) {
        Write-Host "[ERROR] No backup files found in .\backups" -ForegroundColor Red
        exit 1
    }
    Write-Host "Using latest backup: $BackupFile" -ForegroundColor Cyan
} elseif (!$BackupFile) {
    # List available backups
    Write-Host "Available backups:" -ForegroundColor Cyan
    Get-ChildItem ".\backups" -Filter "backup_*.sql" | 
        Sort-Object LastWriteTime -Descending |
        ForEach-Object { Write-Host "  - $($_.Name) ($([math]::Round($_.Length/1KB, 2)) KB)" }
    
    $BackupFile = Read-Host "`nEnter backup filename (or full path)"
    
    # If just filename provided, look in backups directory
    if (!(Test-Path $BackupFile)) {
        $BackupFile = ".\backups\$BackupFile"
    }
}

if (!(Test-Path $BackupFile)) {
    Write-Host "[ERROR] Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

# Confirm restore
Write-Host "`n[WARNING] This will REPLACE all current data in the database!" -ForegroundColor Yellow
$confirm = Read-Host "Are you sure you want to restore from $BackupFile? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "[CANCELLED] Restore cancelled" -ForegroundColor Red
    exit 0
}

Write-Host "`nRestoring database from backup..." -ForegroundColor Cyan

try {
    # Restore using psql via docker exec
    Get-Content $BackupFile | docker compose exec -T postgres psql -U $dbUser $dbName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Database restored successfully!" -ForegroundColor Green
        
        # Verify restoration
        Write-Host "`nVerifying restoration..." -ForegroundColor Cyan
        node check-data.js
    } else {
        throw "Restore failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host "[ERROR] Restore failed: $_" -ForegroundColor Red
    exit 1
}
