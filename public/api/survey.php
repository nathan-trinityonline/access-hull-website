<?php
// Receives the community survey. Answers are stored anonymously; if the person asks for help,
// their contact details are stored separately with nothing linking them to the answers.
declare(strict_types=1);
require __DIR__ . '/lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') ah_json(['ok' => false], 405);
$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) ah_json(['ok' => false], 400);

// Spam: bots fill the hidden field. Pretend it worked so they don't retry.
if (trim((string)($in['bot-field'] ?? '')) !== '') ah_json(['ok' => true]);
if (ah_rate_limited('survey', 10)) ah_json(['ok' => false, 'error' => 'busy'], 429);

$q = json_decode((string)file_get_contents(__DIR__ . '/survey.json'), true);
$a = is_array($in['answers'] ?? null) ? $in['answers'] : [];
$str = fn($v, int $max = 200) => mb_substr(trim(is_string($v) ? $v : ''), 0, $max);
$one = fn(string $k, array $opts) => in_array($a[$k] ?? '', $opts, true) ? $a[$k] : '';
$many = fn(string $k, array $opts) => array_values(array_intersect($opts, is_array($a[$k] ?? null) ? $a[$k] : []));

$answers = ['who' => $one('who', $q['single']['who']), 'ward' => $one('ward', $q['wards'])];
foreach (['age', 'disability', 'freq', 'tariff', 'benefits'] as $k) $answers[$k] = $one($k, $q['single'][$k]);
foreach (['access', 'devices', 'cost', 'impact'] as $k) $answers[$k] = $many($k, $q['multi'][$k]);
$answers['skills'] = [];
foreach ($q['tasks'] as $t) $answers['skills'][$t] = in_array($a['skills'][$t] ?? '', $q['levels'], true) ? $a['skills'][$t] : '';
$answers['confidence'] = in_array((string)($a['confidence'] ?? ''), $q['single']['confidence'], true) ? (int)$a['confidence'] : null;
$answers['wantHelp'] = ($a['wantHelp'] ?? false) === true;
$answers['helpWith'] = $answers['wantHelp'] ? $many('helpWith', $q['multi']['helpWith']) : [];
$answers['helpHow'] = $answers['wantHelp'] ? $one('helpHow', $q['single']['helpHow']) : '';
$answers['comments'] = $str($a['comments'] ?? '', 2000);

if ($answers['ward'] === '' || $answers['age'] === '' || !$answers['access']) ah_json(['ok' => false, 'error' => 'incomplete'], 400);

$help = null;
if ($answers['wantHelp']) {
    $h = is_array($in['help'] ?? null) ? $in['help'] : [];
    $help = [
        'firstName' => $str($h['firstName'] ?? '', 80),
        'phone' => $str($h['phone'] ?? '', 40),
        'email' => filter_var($str($h['email'] ?? '', 200), FILTER_VALIDATE_EMAIL) ?: '',
        'bestTime' => in_array($h['bestTime'] ?? '', $q['single']['bestTime'], true) ? $h['bestTime'] : 'Any time',
        'language' => $str($h['language'] ?? '', 80),
        'supportNeeds' => $str($h['supportNeeds'] ?? '', 500),
        'postcode' => strtoupper($str($h['postcode'] ?? '', 10)),
        'ward' => $answers['ward'],
        'helpWith' => $answers['helpWith'],
        'helpHow' => $answers['helpHow'],
        'completedFor' => $answers['who'],
        'shareWithPartner' => ($h['shareWithPartner'] ?? false) === true,
        'status' => 'new',
    ];
    if ($help['firstName'] === '' || ($help['phone'] === '' && $help['email'] === '') || ($h['consent'] ?? false) !== true) {
        ah_json(['ok' => false, 'error' => 'contact'], 400);
    }
}

try {
    $db = ah_db();
    // Only the day is kept with the answers, so they can't be matched to a help request by time.
    $db->prepare('INSERT INTO responses (day, data) VALUES (?, ?)')->execute([gmdate('Y-m-d'), json_encode($answers)]);
    if ($help) $db->prepare('INSERT INTO help_requests (created_at, data) VALUES (?, ?)')->execute([gmdate('Y-m-d H:i:s'), json_encode($help)]);
    ah_purge();
} catch (Throwable $e) {
    error_log('Access:Hull survey: ' . $e->getMessage());
    ah_json(['ok' => false], 500);
}

// Email alerts. Never include answers about health, disability or benefits.
$alert = ah_config()['survey_alerts'] ?? [];
$to = (array)($alert['to'] ?? []);
$helpSaved = true;
if ($to && $help) {
    $body = "Someone has asked for help through the community survey.\n\n"
        . "First name: {$help['firstName']}\n"
        . 'Phone: ' . ($help['phone'] ?: '(not given)') . "\n"
        . 'Email: ' . ($help['email'] ?: '(not given)') . "\n"
        . "Best time to contact: {$help['bestTime']}\n"
        . 'Preferred language: ' . ($help['language'] ?: '(not given)') . "\n"
        . 'Support needs: ' . ($help['supportNeeds'] ?: '(none given)') . "\n"
        . "Ward: {$help['ward']}\n"
        . 'Postcode: ' . ($help['postcode'] ?: '(not given)') . "\n"
        . 'Help wanted: ' . ($help['helpWith'] ? implode(', ', $help['helpWith']) : '(not given)') . "\n"
        . 'How they would like help: ' . ($help['helpHow'] ?: '(not given)') . "\n"
        . "Filled in by: {$help['completedFor']}\n"
        . 'OK to pass to a local partner: ' . ($help['shareWithPartner'] ? 'Yes' : 'No') . "\n\n"
        . "Please contact them within 5 working days.\n--\nSent from the Access:Hull website on " . date('j F Y \a\t H:i') . "\n";
    ah_mail($to, 'Survey: help request from ' . $help['firstName'], $body, $help['email']);
} elseif ($to && ($alert['every_response'] ?? false)) {
    $body = "A new community survey response has been added.\n\nWard: {$answers['ward']}\n\n"
        . "See the live results: https://{$_SERVER['HTTP_HOST']}/survey-results/\n--\nSent from the Access:Hull website on " . date('j F Y \a\t H:i') . "\n";
    ah_mail($to, 'Survey: new response from ' . $answers['ward'], $body);
}

ah_json(['ok' => true, 'help' => $help !== null && $helpSaved]);
