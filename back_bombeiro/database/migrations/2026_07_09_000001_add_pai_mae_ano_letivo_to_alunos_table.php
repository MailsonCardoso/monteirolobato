<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alunos', function (Blueprint $table) {
            $table->string('nome_pai', 120)->nullable()->after('uf');
            $table->string('nome_mae', 120)->nullable()->after('nome_pai');
            $table->string('ano_letivo', 4)->nullable()->after('dia_vencimento');
            $table->string('email_responsavel', 120)->nullable()->after('ano_letivo');
            $table->string('cep_resp', 9)->nullable()->after('email_responsavel');
            $table->string('logradouro_resp', 120)->nullable()->after('cep_resp');
            $table->string('numero_resp', 20)->nullable()->after('logradouro_resp');
            $table->string('bairro_resp', 120)->nullable()->after('numero_resp');
            $table->string('cidade_resp', 120)->nullable()->after('bairro_resp');
            $table->string('parentesco_resp', 120)->nullable()->after('cidade_resp');
            $table->string('matricula', 10)->nullable()->after('parentesco_resp');
        });
    }

    public function down(): void
    {
        Schema::table('alunos', function (Blueprint $table) {
            $table->dropColumn(['nome_pai', 'nome_mae', 'ano_letivo', 'email_responsavel', 'cep_resp', 'logradouro_resp', 'numero_resp', 'bairro_resp', 'cidade_resp', 'parentesco_resp', 'matricula']);
        });
    }
};
