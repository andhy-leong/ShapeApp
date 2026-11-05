<?php
declare(strict_types=1);

date_default_timezone_set('Europe/Paris');

// ---------------------------------------------------------------------------
// Configuration, base de données, réponses JSON, authentification JWT
// ---------------------------------------------------------------------------

function config(string $key)
{
    static $config = null;
    if ($config === null) {
        $path = __DIR__ . '/../config.php';
        if (!is_file($path)) {
            json_error(500, 'config.php manquant sur le serveur (copier config.example.php).');
        }
        $config = require $path;
    }
    return $config[$key] ?? null;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', config('db_host'), config('db_name'));
        $pdo = new PDO($dsn, config('db_user'), config('db_pass'), [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

function json_response($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(int $status, string $message): void
{
    json_response(['error' => $message], $status);
}

function body(): array
{
    static $data = null;
    if ($data === null) {
        $raw = file_get_contents('php://input') ?: '';
        $data = $raw === '' ? [] : json_decode($raw, true);
        if (!is_array($data)) {
            json_error(400, 'Corps JSON invalide.');
        }
    }
    return $data;
}

function str_field(array $src, string $key, int $max = 190, bool $required = false): ?string
{
    $v = $src[$key] ?? null;
    if ($v === null || $v === '') {
        if ($required) json_error(422, "Champ requis : $key");
        return null;
    }
    if (!is_string($v) && !is_numeric($v)) json_error(422, "Champ invalide : $key");
    return mb_substr(trim((string)$v), 0, $max);
}

function num_field(array $src, string $key, float $min = 0, float $max = 100000): ?float
{
    $v = $src[$key] ?? null;
    if ($v === null || $v === '') return null;
    if (!is_numeric($v)) json_error(422, "Champ numérique invalide : $key");
    return max($min, min($max, (float)$v));
}

function enum_field(array $src, string $key, array $allowed): ?string
{
    $v = $src[$key] ?? null;
    if ($v === null || $v === '') return null;
    if (!in_array($v, $allowed, true)) json_error(422, "Valeur invalide pour $key");
    return $v;
}

// ---------------------------------------------------------------------------
// JWT HS256 minimal (pas de dépendance Composer, compatible hébergement mutualisé)
// ---------------------------------------------------------------------------

function b64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode(string $data): string
{
    return base64_decode(strtr($data, '-_', '+/')) ?: '';
}

function jwt_create(int $userId): string
{
    $header  = b64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = b64url_encode(json_encode([
        'sub' => $userId,
        'iat' => time(),
        'exp' => time() + 86400 * (int)config('jwt_ttl_days'),
    ]));
    $sig = b64url_encode(hash_hmac('sha256', "$header.$payload", config('jwt_secret'), true));
    return "$header.$payload.$sig";
}

function jwt_user_id(string $token): ?int
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    $expected = b64url_encode(hash_hmac('sha256', "$h.$p", config('jwt_secret'), true));
    if (!hash_equals($expected, $s)) return null;
    $payload = json_decode(b64url_decode($p), true);
    if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) return null;
    return (int)$payload['sub'];
}

/** Renvoie l'id de l'utilisateur connecté, ou répond 401. */
function require_user(): int
{
    $auth = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? $_SERVER['HTTP_X_AUTH_TOKEN']
        ?? '';
    $token = preg_replace('/^Bearer\s+/i', '', $auth);
    $uid = $token ? jwt_user_id($token) : null;
    if (!$uid) json_error(401, 'Session expirée, reconnecte-toi.');

    $stmt = db()->prepare('SELECT id FROM users WHERE id = ?');
    $stmt->execute([$uid]);
    if (!$stmt->fetch()) json_error(401, 'Compte introuvable.');
    return $uid;
}
