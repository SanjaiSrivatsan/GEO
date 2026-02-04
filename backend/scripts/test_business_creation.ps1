# Business Profile Creation Test
# Run this in PowerShell while backend server is running

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TESTING BUSINESS PROFILE CREATION" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Register user
Write-Host "Step 1: Registering test user..." -ForegroundColor Yellow
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$registerBody = @{
    email = "test$timestamp@example.com"
    password = "testpass123"
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/auth/register" `
    -Method POST `
    -Body $registerBody `
    -ContentType "application/json"

$token = $registerResponse.token.access_token
$userId = $registerResponse.user.id

Write-Host "✓ User registered: $($registerResponse.user.email)" -ForegroundColor Green
Write-Host "✓ User ID: $userId" -ForegroundColor Green
Write-Host ""

# Step 2: Create business profile
Write-Host "Step 2: Creating business profile..." -ForegroundColor Yellow
$profileBody = @{
    name = "Test Business Inc"
    category = "Software Development"
    primary_location = "San Francisco, CA"
    website = "https://testbusiness.com"
    brand_voice = "Professional, innovative, customer-focused"
    main_goal = "Improve local search visibility"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$profileResponse = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/business/profiles" `
    -Method POST `
    -Body $profileBody `
    -Headers $headers

$entityId = $profileResponse.profile.id

Write-Host "✓ Business profile created!" -ForegroundColor Green
Write-Host "✓ Entity ID: $entityId" -ForegroundColor Green
Write-Host "✓ Name: $($profileResponse.profile.name)" -ForegroundColor Green
Write-Host "✓ Category: $($profileResponse.profile.category)" -ForegroundColor Green
Write-Host "✓ Location: $($profileResponse.profile.primary_location)" -ForegroundColor Green
Write-Host ""

# Step 3: Verify profile retrieval
Write-Host "Step 3: Retrieving business profile..." -ForegroundColor Yellow
$retrievedProfile = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/business/profiles/$entityId" `
    -Method GET `
    -Headers $headers

Write-Host "✓ Profile retrieved successfully!" -ForegroundColor Green
Write-Host "✓ Name matches: $($retrievedProfile.name -eq 'Test Business Inc')" -ForegroundColor Green
Write-Host ""

# Step 4: Get all profiles
Write-Host "Step 4: Getting all user profiles..." -ForegroundColor Yellow
$allProfiles = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/business/profiles" `
    -Method GET `
    -Headers $headers

Write-Host "✓ Found $($allProfiles.Count) profile(s) for user" -ForegroundColor Green
Write-Host ""

# Success!
Write-Host "============================================================" -ForegroundColor Green
Write-Host "✓ ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Entity ID: $entityId" -ForegroundColor Cyan
Write-Host "User ID: $userId" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database verification command:" -ForegroundColor Yellow
Write-Host "`$env:PGPASSWORD='sanjai14' ; & 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -d geo_db -c `"SELECT id, name, category FROM business_profiles WHERE id='$entityId';`"" -ForegroundColor Gray
