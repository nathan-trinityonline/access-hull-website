<?php
// Sign-in for the content editor (Decap CMS at /admin/) using GitHub.
// Decap opens this page in a pop-up; it sends the person to GitHub, then hands
// the access token back to the editor window. Settings are in config.php.
declare(strict_types=1);

$config = require __DIR__ . '/config.php';
$clientId = (string)($config['github_client_id'] ?? '');
$secret = (string)($config['github_client_secret'] ?? '');
$origin = 'https://' . ($_SERVER['HTTP_HOST'] ?? '');
$self = $origin . strtok($_SERVER['REQUEST_URI'] ?? '/api/auth.php', '?');

function reply(string $status, array $content, string $origin): void {
    $msg = 'authorization:github:' . $status . ':' . json_encode($content);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    $m = json_encode($msg);
    $o = json_encode($origin);
    echo "<!doctype html><meta charset=\"utf-8\"><title>Signing in</title><p>Signing in…</p><script>
(function(){
  function receive(e){
    if(e.origin!=={$o})return;
    window.opener.postMessage({$m}, e.origin);
    window.removeEventListener('message', receive);
    setTimeout(function(){window.close()}, 500);
  }
  window.addEventListener('message', receive, false);
  if(window.opener) window.opener.postMessage('authorizing:github', {$o});
})();
</script>";
    exit;
}

if ($clientId === '' || $secret === '') reply('error', ['message' => 'GitHub sign-in is not set up yet (api/config.php).'], $origin);

$secure = ['expires' => time() + 600, 'path' => '/api/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax'];

if (!isset($_GET['code'])) {
    // Step 1: send the person to GitHub
    $state = bin2hex(random_bytes(16));
    setcookie('ah_oauth_state', $state, $secure);
    $scope = 'repo';
    header('Location: https://github.com/login/oauth/authorize?' . http_build_query([
        'client_id' => $clientId, 'redirect_uri' => $self, 'scope' => $scope, 'state' => $state,
    ]), true, 302);
    exit;
}

// Step 2: GitHub sent them back with a code
$state = (string)($_GET['state'] ?? '');
$expected = (string)($_COOKIE['ah_oauth_state'] ?? '');
setcookie('ah_oauth_state', '', ['expires' => 1] + $secure);
if ($expected === '' || !hash_equals($expected, $state)) reply('error', ['message' => 'Sign-in expired. Please try again.'], $origin);

$ch = curl_init('https://github.com/login/oauth/access_token');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
    CURLOPT_POSTFIELDS => http_build_query([
        'client_id' => $clientId, 'client_secret' => $secret, 'code' => (string)$_GET['code'], 'redirect_uri' => $self,
    ]),
    CURLOPT_TIMEOUT => 15,
]);
$res = json_decode((string)curl_exec($ch), true);
curl_close($ch);

if (!is_array($res) || empty($res['access_token'])) reply('error', ['message' => 'GitHub did not accept the sign-in. Please try again.'], $origin);
reply('success', ['token' => $res['access_token'], 'provider' => 'github'], $origin);
