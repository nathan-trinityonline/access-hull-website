<?php
// Shared helpers for the form, survey, results and export scripts. Not served directly (see .htaccess).
declare(strict_types=1);

function ah_config(): array {
    static $config = null;
    if ($config === null) {
        $file = __DIR__ . '/config.php';
        if (!is_file($file)) { error_log('Access:Hull: api/config.php is missing'); ah_json(['ok' => false], 500); }
        $config = require $file;
    }
    return $config;
}

function ah_json(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($data);
    exit;
}

// SQLite database kept outside public_html, so it can never be downloaded.
// The deploy only replaces public_html, so the data survives every publish.
function ah_db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $dir = ah_config()['data_dir'] ?? dirname(__DIR__, 2) . '/private';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $pdo = new PDO('sqlite:' . $dir . '/accesshull.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    $pdo->exec('CREATE TABLE IF NOT EXISTS responses (id INTEGER PRIMARY KEY, day TEXT NOT NULL, data TEXT NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS help_requests (id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, data TEXT NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY, form TEXT NOT NULL, created_at TEXT NOT NULL, data TEXT NOT NULL)');
    return $pdo;
}

// Delete personal details once they are past the retention periods in the privacy notice.
function ah_purge(): void {
    $db = ah_db();
    $db->exec("DELETE FROM help_requests WHERE created_at < datetime('now', '-12 months')");
    $db->exec("DELETE FROM submissions WHERE form = 'contact' AND created_at < datetime('now', '-24 months')");
    $db->exec("DELETE FROM submissions WHERE form = 'donate-a-device' AND created_at < datetime('now', '-12 months')");
}

// At most $max requests per visitor every 10 minutes for each kind of form.
function ah_rate_limited(string $kind, int $max = 5): bool {
    $bucket = sys_get_temp_dir() . '/ah-' . $kind . '-' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $now = time();
    $times = array_filter(array_map('intval', @file($bucket, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > $now - 600);
    if (count($times) >= $max) return true;
    $times[] = $now;
    @file_put_contents($bucket, implode("\n", $times), LOCK_EX);
    return false;
}

function ah_mail(array $to, string $subject, string $body, string $replyTo = ''): bool {
    $config = ah_config();
    $clean = fn(string $s) => trim(str_replace(["\r", "\n"], ' ', $s));
    $from = $clean((string)$config['from']);
    $headers = [
        'From' => sprintf('%s <%s>', mb_encode_mimeheader($clean((string)($config['from_name'] ?? 'Website'))), $from),
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => '8bit',
        'MIME-Version' => '1.0',
    ];
    if ($replyTo = filter_var($replyTo, FILTER_VALIDATE_EMAIL) ?: '') $headers['Reply-To'] = $clean($replyTo);
    $to = implode(', ', array_map($clean, $to));
    $ok = mail($to, mb_encode_mimeheader($clean($subject)), $body, $headers, '-f' . $from);
    if (!$ok) error_log("Access:Hull: mail() failed: $subject");
    return $ok;
}

// Signed-in content editors (anyone who can publish to the GitHub repository) are staff.
function ah_is_staff(string $token): bool {
    $repo = ah_config()['github_repo'] ?? '';
    if ($token === '' || $repo === '' || !function_exists('curl_init')) return false;
    $ch = curl_init('https://api.github.com/repos/' . $repo);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Accept: application/vnd.github+json', 'User-Agent: access-hull-website'],
    ]);
    $res = json_decode((string)curl_exec($ch), true);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $code === 200 && !empty($res['permissions']['push']);
}
