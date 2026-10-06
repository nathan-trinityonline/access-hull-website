<?php
// Staff-only export of everything collected. Staff are people signed in to the content editor
// with publish access to the website's GitHub repository.
declare(strict_types=1);
require __DIR__ . '/lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') ah_json(['ok' => false], 405);
$in = json_decode((string)file_get_contents('php://input'), true) ?: [];
if (ah_rate_limited('export', 20)) ah_json(['ok' => false], 429);
if (!ah_is_staff((string)($in['token'] ?? ''))) ah_json(['ok' => false], 403);
if (!empty($in['check'])) ah_json(['ok' => true]);

try {
    $db = ah_db();
    ah_purge();
    $decode = fn(array $rows, string $time) => array_map(fn($r) => ['submitted' => $r[$time]] + json_decode($r['data'], true), $rows);
    $out = ['ok' => true, 'responses' => $decode($db->query('SELECT day, data FROM responses ORDER BY id')->fetchAll(PDO::FETCH_ASSOC), 'day')];
    if (!empty($in['contacts'])) {
        $out['help'] = $decode($db->query('SELECT created_at, data FROM help_requests ORDER BY id')->fetchAll(PDO::FETCH_ASSOC), 'created_at');
        foreach (['contact', 'partner', 'donate-a-device'] as $form) {
            $st = $db->prepare('SELECT created_at, data FROM submissions WHERE form = ? ORDER BY id');
            $st->execute([$form]);
            $out['forms'][$form] = $decode($st->fetchAll(PDO::FETCH_ASSOC), 'created_at');
        }
    }
    ah_json($out);
} catch (Throwable $e) {
    error_log('Access:Hull export: ' . $e->getMessage());
    ah_json(['ok' => false], 500);
}
