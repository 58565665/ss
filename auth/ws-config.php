<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Configurazione del WebSocket server locale per sviluppo
$ws = getenv('ZEROLEGEND_WS_URL') ?: 'ws://192.168.1.157:8080';
$ws = trim($ws);
if (!preg_match('/^wss?:\/\/[^\s]+$/i', $ws)) {
    $ws = 'ws://192.168.1.157:8080';
}
echo json_encode([
    'ok' => true,
    'wsUrl' => rtrim($ws, '/'),
    'source' => 'zerolegend-auto-config',
], JSON_UNESCAPED_SLASHES);
?>
