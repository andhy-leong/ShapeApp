<?php
// Copier ce fichier en "config.php" et remplir les valeurs.
// config.php ne doit JAMAIS être commité (il est dans .gitignore).

return [
    // Identifiants MySQL : IONOS > Hébergement > Bases de données > (votre base) > Détails
    'db_host' => 'dbXXXXXXX.hosting-data.io',
    'db_name' => 'dbsXXXXXXX',
    'db_user' => 'dbuXXXXXXX',
    'db_pass' => 'CHANGE_ME',

    // Secret de signature des jetons de connexion (64 caractères aléatoires).
    // Générer par ex. avec : php -r "echo bin2hex(random_bytes(32));"
    'jwt_secret' => 'CHANGE_ME_WITH_A_LONG_RANDOM_STRING',
    'jwt_ttl_days' => 30,
];
