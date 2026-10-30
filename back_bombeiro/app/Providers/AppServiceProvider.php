<?php

namespace App\Providers;

use App\Events\MensalidadeStatusUpdated;
use App\Listeners\LogMensalidadeStatusUpdate;
use Illuminate\Database\Schema\Builder;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(\App\Services\MercadoPagoService::class);
        $this->app->singleton(\App\Services\PagamentoService::class);

        // Se o .env de produção estiver com APP_MAINTENANCE_DRIVER=database, normaliza para file
        if (config('app.maintenance.driver') === 'database') {
            config(['app.maintenance.driver' => 'file']);
        }
    }

    public function boot(): void
    {
        Builder::defaultStringLength(191);

        // Garante que o driver 'database' retorne FileBasedMaintenanceMode sem estourar exceção
        try {
            $this->app->make(\Illuminate\Foundation\MaintenanceModeManager::class)->extend('database', function () {
                return new \Illuminate\Foundation\FileBasedMaintenanceMode();
            });
        } catch (\Throwable $t) {
            // ignore
        }

        Event::listen(
            MensalidadeStatusUpdated::class,
            LogMensalidadeStatusUpdate::class,
        );
    }
}
