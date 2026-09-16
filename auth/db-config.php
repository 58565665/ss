<?php
/** ZeroLegend DB config — legge le credenziali dalle variabili d'ambiente del container.
 *  Se una variabile non è impostata, usa il valore precedente come fallback
 *  (comodo in transizione, ma imposta sempre le env vars vere su bunny.net). */
define('DB_HOST', getenv('DB_HOST') ?: 'sql313.infinityfree.com');
define('DB_NAME', getenv('DB_NAME') ?: 'if0_42182483_mtmaster');
define('DB_USER', getenv('DB_USER') ?: 'if0_42182483');
define('DB_PASS', getenv('DB_PASS') ?: 'R3bxf6zvnv0');
// Secret condiviso con il backend Node. Deve essere identico al valore impostato
// come API_SECRET nel container del backend Node.
define('API_SECRET', getenv('API_SECRET') ?: 'agar-zero-secret-2026');

date_default_timezone_set('Europe/Rome');

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    if (!extension_loaded('pdo_mysql')) throw new RuntimeException('Estensione PHP pdo_mysql non disponibile sul server.');
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_TIMEOUT => 8,
    ]);
    return $pdo;
}
