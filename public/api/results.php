<?php
// Live survey results: totals only. Any group smaller than min_group is held back, so no one can be identified.
declare(strict_types=1);
require __DIR__ . '/lib.php';

$q = json_decode((string)file_get_contents(__DIR__ . '/survey.json'), true);
$min = (int)$q['min_group'];

try {
    $rows = array_map(fn($r) => json_decode($r, true), ah_db()->query('SELECT data FROM responses')->fetchAll(PDO::FETCH_COLUMN));
} catch (Throwable $e) {
    error_log('Access:Hull results: ' . $e->getMessage());
    ah_json(['ok' => false], 500);
}

$n = count($rows);
if ($n < $min) ah_json(['ok' => true, 'total' => $n, 'min' => $min, 'enough' => false]);

$pct = fn(int $part, int $all) => $all ? (int)round($part / $all * 100) : 0;
$has = fn(array $r, string $k, string $v) => in_array($v, $r[$k] ?? [], true);
$share = function (array $list, string $key, array $opts) use ($pct, $has, $min) {
    if (count($list) < $min) return null;
    $out = [];
    foreach ($opts as $o) $out[$o] = $pct(count(array_filter($list, fn($r) => $has($r, $key, $o))), count($list));
    return $out;
};
$without = fn(array $opts) => array_values(array_filter($opts, fn($o) => !preg_match('/^None/', $o)));

$help = array_values(array_filter($rows, fn($r) => !empty($r['wantHelp'])));
$conf = array_filter(array_column($rows, 'confidence'));
$skills = [];
foreach ($q['tasks'] as $t) {
    $skills[$t] = $pct(count(array_filter($rows, fn($r) => ($r['skills'][$t] ?? '') !== '' && $r['skills'][$t] !== 'On my own')), $n);
}
$byWard = array_count_values(array_column($rows, 'ward'));
$wards = array_filter($byWard, fn($c) => $c >= $min);

ah_json([
    'ok' => true,
    'total' => $n,
    'min' => $min,
    'enough' => true,
    'kpis' => [
        'help' => $pct(count($help), $n),
        'noHome' => $pct(count(array_filter($rows, fn($r) => !$has($r, 'access', 'Home broadband'))), $n),
        'neverTariff' => $pct(count(array_filter($rows, fn($r) => ($r['tariff'] ?? '') === 'No, never')), $n),
        'confidence' => $conf ? round(array_sum($conf) / count($conf), 1) : null,
    ],
    'impact' => $share($rows, 'impact', $without($q['multi']['impact'])),
    'skills' => $skills,
    'help' => $share($help, 'helpWith', $q['multi']['helpWith']),
    'access' => $share($rows, 'access', $q['multi']['access']),
    'cost' => $share($rows, 'cost', $without($q['multi']['cost'])),
    'wards' => $wards,
]);
