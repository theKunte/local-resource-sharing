# Automated Backup Scheduler
# Run this script to set up automatic daily backups using Windows Task Scheduler

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "backup-db.ps1"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$backendPath = Join-Path $projectRoot "backend"

# Task configuration
$taskName = "LocalResourceSharing-DailyBackup"
$description = "Automatically backs up the Local Resource Sharing database daily"
$backupTime = "02:00"  # 2 AM daily

Write-Host "Setting up automatic daily backup..." -ForegroundColor Cyan
Write-Host "   Task Name: $taskName" -ForegroundColor Gray
Write-Host "   Schedule: Daily at $backupTime" -ForegroundColor Gray
Write-Host "   Location: $backendPath" -ForegroundColor Gray

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "`n[WARNING] Task '$taskName' already exists." -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to recreate it? (yes/no)"
    
    if ($overwrite -eq "yes") {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "[OK] Removed existing task" -ForegroundColor Gray
    } else {
        Write-Host "[CANCELLED] Setup cancelled" -ForegroundColor Red
        exit 0
    }
}

try {
    # Create action
    $action = New-ScheduledTaskAction `
        -Execute "PowerShell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -Auto" `
        -WorkingDirectory $backendPath
    
    # Create trigger (daily at specified time)
    $trigger = New-ScheduledTaskTrigger -Daily -At $backupTime
    
    # Create settings
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable
    
    # Register task
    Register-ScheduledTask `
        -TaskName $taskName `
        -Description $description `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -User $env:USERNAME `
        -RunLevel Limited | Out-Null
    
    Write-Host "`n[SUCCESS] Automatic backup scheduled successfully!" -ForegroundColor Green
    Write-Host "`nBackup schedule:" -ForegroundColor Cyan
    Write-Host "   • Daily at $backupTime" -ForegroundColor Gray
    Write-Host "   • Keeps last 10 backups automatically" -ForegroundColor Gray
    Write-Host "   • Backups stored in: $backendPath\backups" -ForegroundColor Gray
    
    Write-Host "`nManagement commands:" -ForegroundColor Cyan
    Write-Host "   • View task: Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host "   • Run now:   Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host "   • Disable:   Disable-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host "   • Remove:    Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    
} catch {
    Write-Host "`n[ERROR] Failed to create scheduled task: $_" -ForegroundColor Red
    exit 1
}
