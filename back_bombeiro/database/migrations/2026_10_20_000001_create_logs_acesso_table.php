<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs_acesso', function (Blueprint $table) {
            $table->id();
            $table->foreignId('associado_id')->nullable()->constrained('associados')->nullOnDelete();
            $table->string('nome')->nullable();
            $table->string('email')->nullable();
            $table->string('cpf', 11)->nullable();
            $table->string('evento', 30);
            $table->string('motivo', 50)->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamps();

            $table->index('created_at');
            $table->index('evento');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs_acesso');
    }
};
