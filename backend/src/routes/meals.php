<?php
declare(strict_types=1);

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

function meals_list(): void
{
    $uid = require_user();
    $stmt = db()->prepare(
        'SELECT id, name, meal_type, calories, protein_g, carbs_g, fat_g, source, eaten_at
           FROM meal_logs WHERE user_id = ? AND DATE(eaten_at) = ? ORDER BY eaten_at'
    );
    $stmt->execute([$uid, request_date()]);
    json_response(['meals' => array_map('meal_row', $stmt->fetchAll())]);
}

function meals_create(): void
{
    $uid = require_user();
    $b = body();

    $eatenAt = (string)($b['eatenAt'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/', $eatenAt)) {
        $eatenAt = date('Y-m-d H:i:s');
    }

    $pdo = db();
    $pdo->prepare(
        'INSERT INTO meal_logs (user_id, name, meal_type, calories, protein_g, carbs_g, fat_g, source, eaten_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $uid,
        str_field($b, 'name', 190, true),
        enum_field($b, 'mealType', MEAL_TYPES) ?? 'snack',
        (int)round(num_field($b, 'calories', 0, 10000) ?? 0),
        num_field($b, 'proteinG', 0, 1000) ?? 0,
        num_field($b, 'carbsG', 0, 1000) ?? 0,
        num_field($b, 'fatG', 0, 1000) ?? 0,
        enum_field($b, 'source', ['scan', 'barcode', 'suggestion', 'manual']) ?? 'manual',
        $eatenAt,
    ]);

    $stmt = $pdo->prepare('SELECT * FROM meal_logs WHERE id = ?');
    $stmt->execute([(int)$pdo->lastInsertId()]);
    json_response(['meal' => meal_row($stmt->fetch())], 201);
}

function meals_delete(int $id): void
{
    $uid = require_user();
    db()->prepare('DELETE FROM meal_logs WHERE id = ? AND user_id = ?')->execute([$id, $uid]);
    json_response(['ok' => true]);
}

function meal_row(array $r): array
{
    return [
        'id'       => (int)$r['id'],
        'name'     => $r['name'],
        'mealType' => $r['meal_type'],
        'calories' => (int)$r['calories'],
        'proteinG' => (float)$r['protein_g'],
        'carbsG'   => (float)$r['carbs_g'],
        'fatG'     => (float)$r['fat_g'],
        'source'   => $r['source'],
        'eatenAt'  => $r['eaten_at'],
    ];
}
