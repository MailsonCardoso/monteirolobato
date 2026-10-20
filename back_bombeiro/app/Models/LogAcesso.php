<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogAcesso extends Model
{
    public const EVENTO_LOGIN = 'login';
    public const EVENTO_LOGIN_FALHA = 'login_falha';
    public const EVENTO_LOGOUT = 'logout';
    public const EVENTO_CADASTRO = 'cadastro';

    protected $table = 'logs_acesso';

    protected $fillable = [
        'associado_id',
        'nome',
        'email',
        'cpf',
        'evento',
        'motivo',
        'ip',
        'user_agent',
    ];

    public function associado(): BelongsTo
    {
        return $this->belongsTo(Associado::class);
    }
}
