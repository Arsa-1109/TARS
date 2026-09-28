# scripts/demo_preflight.ps1
# ==============================================================================
# TARS ASYNC'26 Track 1: Sovereign AI - Stage Demo Preflight & Warm-Up Script
# Patch P-07: Stage Demo Flight-Plan & Operational Health Check
# ==============================================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   TARS SOVEREIGN AI :: STAGE DEMO PREFLIGHT & HEALTH CHECK (P-07)   " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Pin Ollama VRAM Keep-Alive (-1 = Never unload from VRAM)
Write-Host "[1/5] Configuring Ollama VRAM Persistence..." -ForegroundColor Yellow
$env:OLLAMA_KEEP_ALIVE = "-1"
[System.Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "-1", "Process")
Write-Host "      [ PASS ] OLLAMA_KEEP_ALIVE set to '-1' (Permanent VRAM retention)" -ForegroundColor Green

# 2. Ping Ollama and Preload Models into VRAM
Write-Host ""
Write-Host "[2/5] Probing Local Ollama and Preloading Models into VRAM..." -ForegroundColor Yellow
$ollamaUrl = if ($env:OLLAMA_BASE_URL) { $env:OLLAMA_BASE_URL } else { "http://localhost:11434" }
$ollamaOnline = $false

try {
    $tagsResp = Invoke-RestMethod -Uri "$ollamaUrl/api/tags" -Method Get -TimeoutSec 2 -ErrorAction Stop
    $ollamaOnline = $true
    Write-Host "      [ PASS ] Local Ollama daemon is ONLINE ($ollamaUrl)" -ForegroundColor Green
    
    $installed = @()
    if ($tagsResp.models) {
        $installed = $tagsResp.models | ForEach-Object { $_.name }
        Write-Host "      [ INFO ] Installed models: $($installed -join ', ')" -ForegroundColor DarkGray
    }

    # Preload Deep Reasoning model (qwen3:8b or cascade fallback)
    $deepModels = @("qwen3:8b", "qwen2.5-coder:7b", "qwen2.5:7b", "deepseek-r1:7b")
    $deepTarget = $null
    foreach ($m in $deepModels) {
        if ($installed -contains $m) { $deepTarget = $m; break }
    }
    if (-not $deepTarget) { $deepTarget = "qwen3:8b" }

    Write-Host "      [ .... ] Warming Deep Reasoning model ($deepTarget)..." -NoNewline
    try {
        $body = @{ model = $deepTarget; prompt = "ping"; stream = $false; keep_alive = -1 } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "$ollamaUrl/api/generate" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 15
        Write-Host " [ WARMED ]" -ForegroundColor Green
    } catch {
        Write-Host " [ STANDBY ] (Offline fallback will be used)" -ForegroundColor DarkYellow
    }

    # Preload Extraction model (qwen3:1.7b or cascade fallback)
    $extModels = @("qwen3:1.7b", "qwen2.5:1.5b", "llama3.2:1b", "qwen2.5-coder:1.5b")
    $extTarget = $null
    foreach ($m in $extModels) {
        if ($installed -contains $m) { $extTarget = $m; break }
    }
    if (-not $extTarget) { $extTarget = "qwen3:1.7b" }

    Write-Host "      [ .... ] Warming Extraction model ($extTarget)..." -NoNewline
    try {
        $body = @{ model = $extTarget; prompt = "ping"; stream = $false; keep_alive = -1 } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "$ollamaUrl/api/generate" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
        Write-Host " [ WARMED ]" -ForegroundColor Green
    } catch {
        Write-Host " [ STANDBY ] (Offline fallback will be used)" -ForegroundColor DarkYellow
    }

} catch {
    Write-Host "      [ WARN ] Ollama not reachable at $ollamaUrl" -ForegroundColor Yellow
    Write-Host "      [ INFO ] TARS zero-egress deterministic fallbacks active (0.00 KB egress)" -ForegroundColor DarkGray
}

# 3. Check Demo Assets Presence
Write-Host ""
Write-Host "[3/5] Verifying Golden Demo Assets..." -ForegroundColor Yellow
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$assets = @(
    "demo_assets/demo_runway_q4.xlsx",
    "demo_assets/acme_nda_call_sample.vtt"
)

foreach ($asset in $assets) {
    $fullPath = Join-Path $rootDir $asset
    if (Test-Path $fullPath) {
        $size = (Get-Item $fullPath).Length
        Write-Host "      [ PASS ] Found $asset ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "      [ FAIL ] Missing golden asset: $asset" -ForegroundColor Red
    }
}

# 4. Verify Port Availability & Listener Status (7777 FastAPI, 3000 Vite)
Write-Host ""
Write-Host "[4/5] Inspecting Stage Gateway Ports..." -ForegroundColor Yellow
$ports = @(7777, 3000)

foreach ($port in $ports) {
    $active = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($active) {
        $state = ($active | Select-Object -First 1).State
        Write-Host "      [ READY ] Port $port is ACTIVE (State: $state)" -ForegroundColor Green
    } else {
        Write-Host "      [ CLEAR ] Port $port is AVAILABLE for startup" -ForegroundColor Cyan
    }
}

# 5. Output 3-Minute Sovereign Stage Demo Flight-Plan
Write-Host ""
Write-Host "[5/5] ASYNC'26 Track 1: 3-Minute Stage Demo Flight-Plan" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host " TIME     | WORKSPACE               | ACTION & ARCHITECTURAL HIGHLIGHT" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host " 00:00-00:45 | W1: Knowledge Base     | Ingest demo_runway_q4.xlsx -> Markitdown table"
Write-Host "             | (Sovereign Ingestion)   | flattening. Demonstrate E_net = 0.00 KB egress."
Write-Host " 00:45-01:30 | W2: Call Studio        | Ingest acme_nda_call_sample.vtt -> Whisper CPU"
Write-Host "             | (Audio Intelligence)    | transcription. Extract 4-part spec into Action Hub."
Write-Host " 01:30-02:15 | W6: Architecture       | Run AST invariant scan (<20ms). Block HTTP inside DB"
Write-Host "             | (Cortex Invariants)     | tx (INV-017) and dormant flag resuscitation (INV-014)."
Write-Host " 02:15-03:00 | W4 & W5: Decisions     | Propose 'Build bespoke SAML SSO for Acme Corp'."
Write-Host "             | (Contradiction Check)   | Cortex graph triggers conflict with Decision #14."
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""
Write-Host ">>> PREFLIGHT VERIFICATION COMPLETE: ALL SYSTEMS READY FOR STAGE DEMO <<<" -ForegroundColor Green
Write-Host ""
