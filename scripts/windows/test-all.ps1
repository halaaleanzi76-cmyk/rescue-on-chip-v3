# Runs every automated check. The API checks need the app running (start.ps1).
$ErrorActionPreference = 'Continue'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$Py = Join-Path $Root '.venv\Scripts\python.exe'
$failed = 0
function Run($name, $dir, [string[]]$cmd) {
  Write-Host "`n==> $name" -ForegroundColor Cyan
  Push-Location $dir; & $cmd[0] $cmd[1..($cmd.Length-1)]; $code = $LASTEXITCODE; Pop-Location
  if ($code -ne 0) { $script:failed++; Write-Host "FAILED: $name" -ForegroundColor Red } else { Write-Host "PASSED: $name" -ForegroundColor Green }
}
$api = Join-Path $Root 'artifacts\api-server'
foreach ($m in 'simulation.test_engine','simulation.test_visualization','vascular.test_solver','vascular.test_api','research.test_research_ai','auth.test_auth') {
  Run $m $api @($Py, '-m', 'unittest', $m)
}
Run 'clinical_evidence' (Join-Path $api 'research\clinical_evidence') @($Py, '-m', 'unittest')
Run 'TypeScript typecheck' $Root @('pnpm.cmd', 'run', 'typecheck')
Run 'Arabic coverage of engine text' $Root @($Py, 'scripts\check_engine_translations.py')
Run 'Verdict A: mathematical verification' $Root @($Py, (Join-Path (Join-Path (Join-Path $Root 'REAL_WORLD_VALIDATION_EVIDENCE') 'runs') 'run_verification.py'))
Run 'API workflow (live server)' $Root @($Py, 'scripts\check_simulation_workflow.py')
Run 'Visualization API (live server)' $Root @($Py, 'scripts\check_visualization_api.py')
Run 'Browser E2E (Playwright, live server)' (Join-Path (Join-Path $Root 'artifacts') 'rescue-lab') @('npx.cmd', 'playwright', 'test', '--reporter=line')
Write-Host "`n$failed suite(s) failed" -ForegroundColor ($(if ($failed) { 'Red' } else { 'Green' }))
exit $failed
