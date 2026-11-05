<?php
declare(strict_types=1);

// Point d'entrée unique de l'API FitVision.
// Exemple : https://api.mondomaine.fr/auth/login  →  route "POST /auth/login"

ini_set('display_errors', '0');
error_reporting(E_ALL);

require __DIR__ . '/src/bootstrap.php';
require __DIR__ . '/src/routes/auth.php';
require __DIR__ . '/src/routes/profile.php';
require __DIR__ . '/src/routes/meals.php';
require __DIR__ . '/src/routes/fridge.php';
require __DIR__ . '/src/routes/workouts.php';

// Note : l'IA n'est PAS appelée par ce serveur. Chaque utilisateur branche sa propre clé
// (Claude, ChatGPT ou Gemini) dans l'app, qui appelle le fournisseur directement.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Chemin relatif au dossier où l'API est installée (fonctionne aussi dans un sous-dossier)
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($base !== '' && str_starts_with($path, $base)) {
    $path = substr($path, strlen($base));
}
$path = '/' . trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];

$routes = [
    ['GET',    '/health',                 fn() => json_response(['ok' => true])],

    ['POST',   '/auth/register',          'auth_register'],
    ['POST',   '/auth/login',             'auth_login'],

    ['GET',    '/me',                     'me_get'],
    ['PUT',    '/me/profile',             'me_update_profile'],
    ['DELETE', '/me',                     'me_delete'],
    ['GET',    '/dashboard',              'dashboard_get'],

    ['GET',    '/meals',                  'meals_list'],
    ['POST',   '/meals',                  'meals_create'],
    ['DELETE', '/meals/(\d+)',            'meals_delete'],

    ['GET',    '/fridge',                 'fridge_list'],
    ['POST',   '/fridge',                 'fridge_add'],
    ['DELETE', '/fridge/(\d+)',           'fridge_delete'],
    ['DELETE', '/fridge',                 'fridge_clear'],

    ['GET',    '/workouts',               'workouts_list'],
    ['POST',   '/workouts',               'workouts_create'],
    ['POST',   '/workouts/(\d+)/favorite','workouts_toggle_favorite'],
    ['DELETE', '/workouts/(\d+)',         'workouts_delete'],
    ['GET',    '/sessions',               'sessions_list'],
    ['POST',   '/sessions',               'sessions_create'],
];

try {
    foreach ($routes as [$m, $pattern, $handler]) {
        if ($m === $method && preg_match('#^' . $pattern . '$#', $path, $matches)) {
            array_shift($matches);
            $handler(...array_map('intval', $matches));
            exit;
        }
    }
    json_error(404, 'Route introuvable.');
} catch (PDOException $e) {
    error_log('DB error: ' . $e->getMessage());
    json_error(500, 'Erreur de base de données.');
} catch (Throwable $e) {
    error_log('Server error: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    json_error(500, 'Erreur serveur.');
}
