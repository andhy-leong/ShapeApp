<?php
declare(strict_types=1);

function workout_row(array $r): array
{
    $data = json_decode($r['data_json'], true) ?: [];
    $data['id'] = (string)$r['id'];
    $data['favorite'] = (bool)$r['favorite'];
    $data['createdAt'] = $r['created_at'];
    return $data;
}

function workouts_list(): void
{
    $uid = require_user();
    $stmt = db()->prepare('SELECT id, data_json, favorite, created_at FROM workouts WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$uid]);
    json_response(['workouts' => array_map('workout_row', $stmt->fetchAll())]);
}

/** Enregistre une routine (générée par l'IA) dans la bibliothèque de l'utilisateur. */
function workouts_create(): void
{
    $uid = require_user();
    $b = body();
    $title = str_field($b, 'title', 190, true);
    if (!isset($b['exercises']) || !is_array($b['exercises']) || !$b['exercises']) {
        json_error(422, 'La routine doit contenir des exercices.');
    }
    unset($b['id'], $b['favorite'], $b['createdAt']);
    $json = json_encode($b, JSON_UNESCAPED_UNICODE);
    if (strlen($json) > 200000) json_error(422, 'Routine trop volumineuse.');

    $pdo = db();
    $pdo->prepare('INSERT INTO workouts (user_id, title, category, data_json) VALUES (?, ?, ?, ?)')
        ->execute([$uid, $title, str_field($b, 'category', 40) ?? 'gym', $json]);

    $stmt = $pdo->prepare('SELECT id, data_json, favorite, created_at FROM workouts WHERE id = ?');
    $stmt->execute([(int)$pdo->lastInsertId()]);
    json_response(['workout' => workout_row($stmt->fetch())], 201);
}

function workouts_toggle_favorite(int $id): void
{
    $uid = require_user();
    db()->prepare('UPDATE workouts SET favorite = 1 - favorite WHERE id = ? AND user_id = ?')->execute([$id, $uid]);
    $stmt = db()->prepare('SELECT id, data_json, favorite, created_at FROM workouts WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $uid]);
    $row = $stmt->fetch();
    if (!$row) json_error(404, 'Routine introuvable.');
    json_response(['workout' => workout_row($row)]);
}

function workouts_delete(int $id): void
{
    $uid = require_user();
    db()->prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?')->execute([$id, $uid]);
    json_response(['ok' => true]);
}

/** Séances des N derniers jours (?days=7), utilisées par l'IA pour varier les entraînements. */
function sessions_list(): void
{
    $uid = require_user();
    $days = max(1, min(90, (int)($_GET['days'] ?? 7)));
    $stmt = db()->prepare(
        'SELECT title, duration_min, calories, started_at FROM workout_sessions
          WHERE user_id = ? AND started_at >= DATE_SUB(NOW(), INTERVAL ? DAY) ORDER BY started_at DESC LIMIT 50'
    );
    $stmt->execute([$uid, $days]);
    json_response(['sessions' => array_map(fn($r) => [
        'title'       => $r['title'],
        'durationMin' => (int)$r['duration_min'],
        'calories'    => (int)$r['calories'],
        'startedAt'   => $r['started_at'],
    ], $stmt->fetchAll())]);
}

/** Enregistre une séance terminée. */
function sessions_create(): void
{
    $uid = require_user();
    $b = body();
    $re = '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/';
    $start = preg_match($re, (string)($b['startedAt'] ?? '')) ? $b['startedAt'] : date('Y-m-d H:i:s');
    $end   = preg_match($re, (string)($b['endedAt'] ?? '')) ? $b['endedAt'] : date('Y-m-d H:i:s');

    db()->prepare(
        'INSERT INTO workout_sessions (user_id, workout_ref, title, duration_min, calories, started_at, ended_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $uid,
        str_field($b, 'workoutRef', 64),
        str_field($b, 'title', 190, true),
        (int)round(num_field($b, 'durationMin', 0, 1440) ?? 0),
        (int)round(num_field($b, 'calories', 0, 20000) ?? 0),
        $start,
        $end,
    ]);
    json_response(['ok' => true], 201);
}
