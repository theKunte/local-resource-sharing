# Database Backup Script
# Creates timestamped backups of the PostgreSQL database

param(
    [string]$BackupDir = ".\backups",
    [switch]$Auto = $false
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

# Create backup directory if it doesn't exist
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$BackupDir/backup_$timestamp.sql"

Write-Host "Creating database backup..." -ForegroundColor Cyan

try {
    # Create backup using pg_dump via docker exec
    docker compose exec -T postgres pg_dump -U $dbUser $dbName > $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $backupFile).Length / 1KB
        Write-Host "[SUCCESS] Backup created: $backupFile ($([math]::Round($fileSize, 2)) KB)" -ForegroundColor Green
        
        # Count resources in backup
        $resourceCount = (Select-String -Path $backupFile -Pattern "INSERT INTO.*Resource" | Measure-Object).Count
        Write-Host "Resources backed up: $resourceCount" -ForegroundColor Yellow
        
        # Auto-cleanup: keep only last 10 backups
        if ($Auto) {
            $oldBackups = Get-ChildItem $BackupDir -Filter "backup_*.sql" | 
                Sort-Object LastWriteTime -Descending | 
                Select-Object -Skip 10
            
            if ($oldBackups) {
                $oldBackups | Remove-Item -Force
                Write-Host "Cleaned up $($oldBackups.Count) old backup(s)" -ForegroundColor Gray
            }
        }
    } else {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host "[ERROR] Backup failed: $_" -ForegroundColor Red
    exit 1
}
