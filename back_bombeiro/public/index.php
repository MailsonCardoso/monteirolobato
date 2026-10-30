<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Normaliza variáveis de ambiente antes de qualquer coisa para evitar erro de driver database no modo manutenção
if (getenv('APP_MAINTENANCE_DRIVER') === 'database') {
    putenv('APP_MAINTENANCE_DRIVER=file');
    $_ENV['APP_MAINTENANCE_DRIVER'] = 'file';
    $_SERVER['APP_MAINTENANCE_DRIVER'] = 'file';
}

// Se o cache de configuração tiver app.maintenance.driver como database, remove para recarregar limpo
$cachedConfig = __DIR__.'/../bootstrap/cache/config.php';
if (file_exists($cachedConfig)) {
    $content = @file_get_contents($cachedConfig);
    if ($content && strpos($content, "'driver' => 'database'") !== false && strpos($content, "'maintenance'") !== false) {
        @unlink($cachedConfig);
    }
}

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
(require_once __DIR__.'/../bootstrap/app.php')
    ->handleRequest(Request::capture());
