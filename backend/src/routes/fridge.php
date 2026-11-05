<?php
declare(strict_types=1);

function fridge_items(int $uid): array
{
    $stmt = db()->prepare('SELECT id, name FROM fridge_items WHERE user_id = ? ORDER BY created_at');
    $stmt->execute([$uid]);
    return array_map(fn($r) => ['id' => (int)$r['id'], 'name' => $r['name']], $stmt->fetchAll());
}

function fridge_insert(int $uid, array $names): void
{
    $stmt = db()->prepare('INSERT IGNORE INTO fridge_items (user_id, name) VALUES (?, ?)');
    foreach ($names as $name) {
        $name = mb_strtolower(mb_substr(trim((string)$name), 0, 120));
        if ($name !== '') $stmt->execute([$uid, $name]);
    }
}

function fridge_list(): void
{
    json_response(['items' => fridge_items(require_user())]);
}

/** Ajoute un ou plusieurs ingrédients : {"name": "..."} ou {"names": ["...", "..."]} */
function fridge_add(): void
{
    $uid = require_user();
    $b = body();
    $names = isset($b['names']) && is_array($b['names']) ? array_slice($b['names'], 0, 50) : [str_field($b, 'name', 120, true)];
    fridge_insert($uid, $names);
    json_response(['items' => fridge_items($uid)], 201);
}

function fridge_delete(int $id): void
{
    $uid = require_user();
    db()->prepare('DELETE FROM fridge_items WHERE id = ? AND user_id = ?')->execute([$id, $uid]);
    json_response(['items' => fridge_items($uid)]);
}

function fridge_clear(): void
{
    $uid = require_user();
    db()->prepare('DELETE FROM fridge_items WHERE user_id = ?')->execute([$uid]);
    json_response(['items' => []]);
}
