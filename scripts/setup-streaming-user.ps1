#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Creates a restricted "Invoker" user account for Duo streaming.

.DESCRIPTION
    This script creates a passwordless Standard User account called "Invoker"
    with restricted access:
    - Blocked from F: drive
    - Blocked from primary user's profile directory (personal files)

    The account is intended for Duo multi-seat streaming sessions.

.EXAMPLE
    .\setup-streaming-user.ps1
#>

$ErrorActionPreference = "Stop"
$Username = "Invoker"
$UserDescription = "Streaming account for Duo"
$BlockedDrive = "F:\"
$BlockedUserProfile = "$env:USERPROFILE"

Write-Host "=== Duo Streaming User Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create the user account
Write-Host "[1/3] Creating user account '$Username'..." -ForegroundColor Yellow

$existingUser = Get-LocalUser -Name $Username -ErrorAction SilentlyContinue
if ($existingUser) {
    Write-Host "  User '$Username' already exists, skipping creation." -ForegroundColor Gray
} else {
    try {
        New-LocalUser -Name $Username -NoPassword -Description $UserDescription | Out-Null
        Add-LocalGroupMember -Group "Users" -Member $Username -ErrorAction SilentlyContinue
        Write-Host "  User '$Username' created successfully." -ForegroundColor Green
    } catch {
        Write-Error "Failed to create user: $_"
        exit 1
    }
}

# Step 2: Block access to F: drive
Write-Host "[2/3] Blocking access to $BlockedDrive..." -ForegroundColor Yellow

if (Test-Path $BlockedDrive) {
    try {
        $result = icacls $BlockedDrive /deny "${Username}:(OI)(CI)F" /T /C 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Access to $BlockedDrive blocked successfully." -ForegroundColor Green
        } else {
            Write-Warning "  icacls returned exit code $LASTEXITCODE. Check output above."
        }
    } catch {
        Write-Warning "Failed to block $BlockedDrive : $_"
    }
} else {
    Write-Host "  Drive $BlockedDrive not found, skipping." -ForegroundColor Gray
}

# Step 3: Block access to personal user folder
Write-Host "[3/3] Blocking access to $BlockedUserProfile..." -ForegroundColor Yellow

if (Test-Path $BlockedUserProfile) {
    try {
        $result = icacls $BlockedUserProfile /deny "${Username}:(OI)(CI)F" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Access to $BlockedUserProfile blocked successfully." -ForegroundColor Green
        } else {
            Write-Warning "  icacls returned exit code $LASTEXITCODE. Check output above."
        }
    } catch {
        Write-Warning "Failed to block $BlockedUserProfile : $_"
    }
} else {
    Write-Warning "  Path $BlockedUserProfile not found!"
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Open Duo Manager from Start menu"
Write-Host "  2. Create a new instance with User Name: $Username"
Write-Host "  3. Leave the password field empty"
Write-Host "  4. Connect via Moonlight to test the restricted session"
Write-Host ""
Write-Host "To verify restrictions, log in as '$Username' and try accessing:" -ForegroundColor White
Write-Host "  - $BlockedDrive (should show Access Denied)"
Write-Host "  - $BlockedUserProfile (should show Access Denied)"
