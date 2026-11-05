-- FitVision — schéma MySQL / MariaDB
-- À importer via phpMyAdmin (onglet "Importer") dans la base créée sur IONOS.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(120) NOT NULL DEFAULT '',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profil sportif + objectifs nutritionnels calculés (1 ligne par utilisateur)
CREATE TABLE IF NOT EXISTS profiles (
  user_id            INT UNSIGNED PRIMARY KEY,
  sex                ENUM('male','female','other') NULL,
  birth_date         DATE NULL,
  height_cm          DECIMAL(5,1) NULL,
  weight_kg          DECIMAL(5,1) NULL,
  target_weight_kg   DECIMAL(5,1) NULL,
  fitness_level      ENUM('beginner','intermediate','advanced') NULL,
  goal               ENUM('lose_weight','gain_muscle','endurance','flexibility') NULL,
  activity_level     ENUM('sedentary','light','moderate','active','very_active') NULL,
  workouts_per_week  TINYINT UNSIGNED NULL,
  equipment          VARCHAR(255) NULL,          -- ex: "gym,dumbbells,none"
  diet_preferences   VARCHAR(255) NULL,          -- ex: "vegetarian,no_lactose"
  target_kcal        INT UNSIGNED NULL,
  target_protein_g   INT UNSIGNED NULL,
  target_carbs_g     INT UNSIGNED NULL,
  target_fat_g       INT UNSIGNED NULL,
  onboarded          TINYINT(1) NOT NULL DEFAULT 0,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal alimentaire
CREATE TABLE IF NOT EXISTS meal_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  name        VARCHAR(190) NOT NULL,
  meal_type   ENUM('breakfast','lunch','dinner','snack') NOT NULL DEFAULT 'snack',
  calories    INT UNSIGNED NOT NULL DEFAULT 0,
  protein_g   DECIMAL(6,1) NOT NULL DEFAULT 0,
  carbs_g     DECIMAL(6,1) NOT NULL DEFAULT 0,
  fat_g       DECIMAL(6,1) NOT NULL DEFAULT 0,
  source      ENUM('scan','barcode','suggestion','manual') NOT NULL DEFAULT 'manual',
  eaten_at    DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_meal_user_date (user_id, eaten_at),
  CONSTRAINT fk_meal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contenu du frigo
CREATE TABLE IF NOT EXISTS fridge_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  name        VARCHAR(120) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fridge (user_id, name),
  CONSTRAINT fk_fridge_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Routines d'entraînement enregistrées (générées par l'IA)
CREATE TABLE IF NOT EXISTS workouts (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  title       VARCHAR(190) NOT NULL,
  category    VARCHAR(40) NOT NULL,
  data_json   MEDIUMTEXT NOT NULL,               -- routine complète (exercices, séries…)
  favorite    TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_workout_user (user_id),
  CONSTRAINT fk_workout_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Séances terminées
CREATE TABLE IF NOT EXISTS workout_sessions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  workout_ref   VARCHAR(64) NULL,                -- id serveur ou id d'une routine intégrée
  title         VARCHAR(190) NOT NULL,
  duration_min  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  calories      INT UNSIGNED NOT NULL DEFAULT 0,
  started_at    DATETIME NOT NULL,
  ended_at      DATETIME NOT NULL,
  INDEX idx_session_user_date (user_id, started_at),
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
