# Threshold check for JMeter results (.jtl). ASCII only on purpose.
# Acceptance criteria: p95 < 500 ms, error rate < 1 percent (same as k6)
param(
    [string[]]$Files = @("baseline.jtl", "load.jtl", "spike.jtl", "stress.jtl")
)

$maxP95 = 500
$maxErr = 1.0

foreach ($f in $Files) {
    if (-not (Test-Path $f)) {
        Write-Host "$f : file not found"
        continue
    }

    $rows = Import-Csv $f
    $n = $rows.Count

    $el = [int[]]($rows.elapsed)
    [Array]::Sort($el)

    $avg = ($el | Measure-Object -Average).Average
    $idx = [math]::Ceiling($n * 0.95) - 1
    $p95 = $el[$idx]

    $fail = @($rows | Where-Object { $_.success -eq 'false' }).Count
    $err = 100.0 * $fail / $n

    $ok = ($p95 -lt $maxP95) -and ($err -lt $maxErr)
    if ($ok) { $verdict = "PASS" } else { $verdict = "FAIL" }

    $line = "{0,-14} n={1,-7} avg={2,8:N2} ms  p95={3,5} ms  errors={4:N2}%  => {5}" -f $f, $n, $avg, $p95, $err, $verdict
    if ($ok) {
        Write-Host $line -ForegroundColor Green
    } else {
        Write-Host $line -ForegroundColor Red
    }
}
