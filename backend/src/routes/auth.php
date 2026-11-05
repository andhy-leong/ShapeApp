<?php
declare(strict_types=1);

function auth_register(): void
{
    $b = body();
    $email = strtolower((string)str_field($b, 'email', 190, true));
    $password = (string)($b['password'] ?? '');
    $name = str_field($b, 'name', 120) ?? '';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_error(422, 'Adresse e-mail invalide.');
    if (strlen($password) < 8) json_error(422, 'Le mot de passe doit contenir au moins 8 caractères.');

    $pdo = db();
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) json_error(409, 'Un compte existe déjà avec cette adresse.');

    $pdo->beginTransaction();
    $pdo->prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
        ->execute([$email, password_hash($password, PASSWORD_DEFAULT), $name]);
    $uid = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO profiles (user_id) VALUES (?)')->execute([$uid]);
    $pdo->commit();

    json_response(['token' => jwt_create($uid), 'user' => user_payload($uid)], 201);
}

function auth_login(): void
{
    $b = body();
    $email = strtolower((string)str_field($b, 'email', 190, true));
    $password = (string)($b['password'] ?? '');

    $stmt = db()->prepare('SELECT id, password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($password, $row['password_hash'])) {
        usleep(300000); // ralentit les attaques par force brute
        json_error(401, 'E-mail ou mot de passe incorrect.');
    }
    json_response(['token' => jwt_create((int)$row['id']), 'user' => user_payload((int)$row['id'])]);
}

/** Utilisateur + profil, format renvoyé à l'app. */
function user_payload(int $uid): array
{
    $stmt = db()->prepare(
        'SELECT u.id, u.email, u.name, p.*
           FROM users u LEFT JOIN profiles p ON p.user_id = u.id
          WHERE u.id = ?'
    );
    $stmt->execute([$uid]);
    $r = $stmt->fetch() ?: [];

    $num = fn($v) => $v === null ? null : (float)$v;
    $int = fn($v) => $v === null ? null : (int)$v;
    $list = fn($v) => $v ? array_values(array_filter(explode(',', $v))) : [];

    return [
        'id'    => (int)$r['id'],
        'email' => $r['email'],
        'name'  => $r['name'],
        'profile' => [
            'sex'               => $r['sex'] ?? null,
            'birthDate'         => $r['birth_date'] ?? null,
            'heightCm'          => $num($r['height_cm'] ?? null),
            'weightKg'          => $num($r['weight_kg'] ?? null),
            'targetWeightKg'    => $num($r['target_weight_kg'] ?? null),
            'fitnessLevel'      => $r['fitness_level'] ?? null,
            'goal'              => $r['goal'] ?? null,
            'activityLevel'     => $r['activity_level'] ?? null,
            'workoutsPerWeek'   => $int($r['workouts_per_week'] ?? null),
            'equipment'         => $list($r['equipment'] ?? null),
            'dietPreferences'   => $list($r['diet_preferences'] ?? null),
            'targetKcal'        => $int($r['target_kcal'] ?? null),
            'targetProteinG'    => $int($r['target_protein_g'] ?? null),
            'targetCarbsG'      => $int($r['target_carbs_g'] ?? null),
            'targetFatG'        => $int($r['target_fat_g'] ?? null),
            'onboarded'         => (bool)($r['onboarded'] ?? false),
        ],
    ];
}
