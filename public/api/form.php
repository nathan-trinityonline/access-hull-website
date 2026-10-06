<?php
// Receives the contact, partner and donate-a-device forms, emails them and keeps a copy for the staff export.
// Recipients and the sender address are set in config.php (see config.example.php).
declare(strict_types=1);
require __DIR__ . '/lib.php';

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function finish(bool $ok, int $status, bool $json): void {
    if ($json) {
        http_response_code($status);
        header('Content-Type: application/json');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => $ok]);
    } elseif ($ok) {
        header('Location: /thank-you/', true, 303);
    } else {
        http_response_code($status);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Sorry, we couldn't send your form. Please go back and try again.";
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') finish(false, 405, $wantsJson);

$config = ah_config();

$formName = (string)($_POST['form-name'] ?? '');
$form = $config['forms'][$formName] ?? null;
if (!$form) finish(false, 400, $wantsJson);

// Spam: bots fill the hidden field. Pretend it worked so they don't retry.
if (trim((string)($_POST['bot-field'] ?? '')) !== '') finish(true, 200, $wantsJson);

// Basic flood protection: at most 5 submissions per address every 10 minutes.
if (ah_rate_limited('form')) finish(false, 429, $wantsJson);

// Build a readable email from the submitted fields.
$skip = ['form-name', 'bot-field'];
$labels = [
    'msg' => 'Message', 'org' => 'Organisation', 'type' => 'Type of organisation', 'web' => 'Website',
    'wards' => 'Areas', 'involve' => 'Would like to', 'who' => 'Groups they support', 'reach' => 'Residents reached each month',
    'space' => 'Public space', 'wifi' => 'Free Wi-Fi', 'role' => 'Job title or role', 'consent' => 'Happy to be contacted',
    'dd-who' => 'Donating as', 'dd-how' => 'Handover', 'owns_devices' => 'Devices are theirs to give',
    'wipe_certificate' => 'Wants a data-wipe certificate', 'other_devices' => 'Other devices',
];
$lines = [];
$record = [];
$fields = 0;
foreach ($_POST as $key => $value) {
    if (in_array($key, $skip, true)) continue;
    if (++$fields > 60) break;
    $value = is_array($value) ? implode(', ', array_map('strval', $value)) : (string)$value;
    $value = mb_substr(trim($value), 0, 5000);
    if ($value === 'on') $value = 'Yes';
    $label = $labels[$key] ?? ucfirst(str_replace(['_', '-'], ' ', (string)$key));
    $record[$label] = $value;
    $lines[] = $label . ":\n" . ($value === '' ? '(not given)' : $value) . "\n";
}
$body = implode("\n", $lines) . "\n--\nSent from the Access:Hull website on " . date('j F Y \a\t H:i') . "\n";

// Keep a copy for the staff export. The email still goes out if this fails.
try {
    ah_db()->prepare('INSERT INTO submissions (form, created_at, data) VALUES (?, ?, ?)')
        ->execute([$formName, gmdate('Y-m-d H:i:s'), json_encode($record)]);
    ah_purge();
} catch (Throwable $e) {
    error_log('Access:Hull forms: could not store submission: ' . $e->getMessage());
}

$sent = ah_mail((array)$form['to'], (string)$form['subject'], $body, (string)($_POST['email'] ?? ''));
finish($sent, $sent ? 200 : 500, $wantsJson);
