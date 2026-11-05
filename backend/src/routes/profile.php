<?php
declare(strict_types=1);

function me_get(): void
{
    json_response(['user' => user_payload(require_user())]);
}

function me_update_profile(): void
{
    $uid = require_user();
    $b = body();

    $fields = [
        'sex'               => enum_field($b, 'sex', ['male', 'female', 'other']),
        'birth_date'        => isset($b['birthDate']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$b['birthDate']) ? $b['birthDate'] : null,
        'height_cm'         => num_field($b, 'heightCm', 80, 260),
        'weight_kg'         => num_field($b, 'weightKg', 25, 400),
        'target_weight_kg'  => num_field($b, 'targetWeightKg', 25, 400),
        'fitness_level'     => enum_field($b, 'fitnessLevel', ['beginner', 'intermediate', 'advanced']),
        'goal'              => enum_field($b, 'goal', ['lose_weight', 'gain_muscle', 'endurance', 'flexibility']),
        'activity_level'    => enum_field($b, 'activityLevel', ['sedentary', 'light', 'moderate', 'active', 'very_active']),
        'workouts_per_week' => num_field($b, 'workoutsPerWeek', 0, 14),
        'equipment'         => isset($b['equipment']) && is_array($b['equipment']) ? mb_substr(implode(',', array_map('strval', $b['equipment'])), 0, 255) : null,
        'diet_preferences'  => isset($b['dietPreferences']) && is_array($b['dietPreferences']) ? mb_substr(implode(',', array_map('strval', $b['dietPreferences'])), 0, 255) : null,
        'target_kcal'       => num_field($b, 'targetKcal', 800, 8000),
        'target_protein_g'  => num_field($b, 'targetProteinG', 0, 600),
        'target_carbs_g'    => num_field($b, 'targetCarbsG', 0, 1200),
        'target_fat_g'      => num_field($b, 'targetFatG', 0, 400),
        'onboarded'         => isset($b['onboarded']) ? ($b['onboarded'] ? 1 : 0) : null,
    ];

    // Seuls les champs envoyés sont mis à jour
    $sets = [];
    $params = [];
    foreach ($fields as $col => $value) {
        if ($value !== null) {
            $sets[] = "$col = ?";
            $params[] = $value;
        }
    }

    $pdo = db();
    if ($sets) {
        $params[] = $uid;
        $pdo->prepare('UPDATE profiles SET ' . implode(', ', $sets) . ' WHERE user_id = ?')->execute($params);
    }
    if ($name = str_field($b, 'name', 120)) {
        $pdo->prepare('UPDATE users SET name = ? WHERE id = ?')->execute([$name, $uid]);
    }

    json_response(['user' => user_payload($uid)]);
}

/** Suppression définitive du compte (obligatoire pour l'App Store). */
function me_delete(): void
{
    $uid = require_user();
    db()->prepare('DELETE FROM users WHERE id = ?')->execute([$uid]);
    json_response(['ok' => true]);
}

/** Données de l'écran d'accueil pour une date (YYYY-MM-DD, heure locale du téléphone). */
function dashboard_get(): void
{
    $uid = require_user();
    $date = request_date();
    $pdo = db();

    $stmt = $pdo->prepare(
        'SELECT COALESCE(SUM(calories),0) AS calories, COALESCE(SUM(protein_g),0) AS protein,
                COALESCE(SUM(carbs_g),0) AS carbs, COALESCE(SUM(fat_g),0) AS fat, COUNT(*) AS entries
           FROM meal_logs WHERE user_id = ? AND DATE(eaten_at) = ?'
    );
    $stmt->execute([$uid, $date]);
    $t = $stmt->fetch();

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS sessions, COALESCE(SUM(duration_min),0) AS minutes, COALESCE(SUM(calories),0) AS calories
           FROM workout_sessions WHERE user_id = ? AND DATE(started_at) = ?'
    );
    $stmt->execute([$uid, $date]);
    $s = $stmt->fetch();

    $stmt = $pdo->prepare('SELECT id, data_json, favorite, created_at FROM workouts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([$uid]);
    $latest = $stmt->fetch();

    json_response([
        'user' => user_payload($uid),
        'date' => $date,
        'totals' => [
            'calories' => (int)$t['calories'],
            'proteinG' => round((float)$t['protein'], 1),
            'carbsG'   => round((float)$t['carbs'], 1),
            'fatG'     => round((float)$t['fat'], 1),
            'entries'  => (int)$t['entries'],
        ],
        'training' => [
            'sessions' => (int)$s['sessions'],
            'minutes'  => (int)$s['minutes'],
            'calories' => (int)$s['calories'],
        ],
        'latestWorkout' => $latest ? workout_row($latest) : null,
    ]);
}

function request_date(): string
{
    $d = $_GET['date'] ?? date('Y-m-d');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) json_error(422, 'Date invalide.');
    return $d;
}
