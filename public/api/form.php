<?php
// Receives the contact, partner and donate-a-device forms and emails them.
// Recipients and the sender address are set in config.php (see config.example.php).
declare(strict_types=1);

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

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) { error_log('Access:Hull forms: api/config.php is missing'); finish(false, 500, $wantsJson); }
$config = require $configFile;

$formName = (string)($_POST['form-name'] ?? '');
$form = $config['forms'][$formName] ?? null;
if (!$form) finish(false, 400, $wantsJson);

// Spam: bots fill the hidden field. Pretend it worked so they don't retry.
if (trim((string)($_POST['bot-field'] ?? '')) !== '') finish(true, 200, $wantsJson);

// Basic flood protection: at most 5 submissions per address every 10 minutes.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$bucket = sys_get_temp_dir() . '/ah-form-' . hash('sha256', $ip);
$now = time();
$times = array_filter(array_map('intval', @file($bucket, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > $now - 600);
if (count($times) >= 5) finish(false, 429, $wantsJson);
$times[] = $now;
@file_put_contents($bucket, implode("\n", $times), LOCK_EX);

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
$fields = 0;
foreach ($_POST as $key => $value) {
    if (in_array($key, $skip, true)) continue;
    if (++$fields > 60) break;
    $value = is_array($value) ? implode(', ', array_map('strval', $value)) : (string)$value;
    $value = mb_substr(trim($value), 0, 5000);
    if ($value === 'on') $value = 'Yes';
    $label = $labels[$key] ?? ucfirst(str_replace(['_', '-'], ' ', (string)$key));
    $lines[] = $label . ":\n" . ($value === '' ? '(not given)' : $value) . "\n";
}
$body = implode("\n", $lines) . "\n--\nSent from the Access:Hull website on " . date('j F Y \a\t H:i') . "\n";

$clean = fn(string $s) => trim(str_replace(["\r", "\n"], ' ', $s));
$replyTo = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL) ?: '';
$from = $clean((string)$config['from']);
$fromName = $clean((string)($config['from_name'] ?? 'Website'));

$headers = [
    'From' => sprintf('%s <%s>', mb_encode_mimeheader($fromName), $from),
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => '8bit',
    'MIME-Version' => '1.0',
];
if ($replyTo) $headers['Reply-To'] = $clean($replyTo);

$to = implode(', ', array_map($clean, (array)$form['to']));
$subject = mb_encode_mimeheader($clean((string)$form['subject']));
$sent = mail($to, $subject, $body, $headers, '-f' . $from);
if (!$sent) error_log("Access:Hull forms: mail() failed for $formName");
finish($sent, $sent ? 200 : 500, $wantsJson);
