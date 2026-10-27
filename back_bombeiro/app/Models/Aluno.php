<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Aluno extends Model
{
    protected $fillable = [
        'nome', 'sexo', 'cpf', 'data_nascimento', 'telefone', 'email', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf',
        'nome_mae', 'nome_pai',
        'responsavel', 'cpf_responsavel', 'telefone_responsavel', 'email_responsavel',
        'turma', 'status', 'situacao',
        'valor_mensalidade', 'dia_vencimento', 'ano_letivo',
        'cep_resp', 'logradouro_resp', 'numero_resp', 'bairro_resp', 'cidade_resp', 'parentesco_resp',
        'matricula',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'string',
            'situacao' => 'string',
        ];
    }

    public function mensalidades(): HasMany
    {
        return $this->hasMany(Mensalidade::class);
    }

    protected static function booted(): void
    {
        static::deleting(function (Aluno $aluno) {
            // Deletar associados vinculados a este aluno
            Associado::where('aluno_id', $aluno->id)->delete();

            // Deletar mensalidades e suas transações/históricos
            $mensalidades = Mensalidade::where('aluno_id', $aluno->id)->get();
            $mensalidadeIds = $mensalidades->pluck('id')->toArray();

            if (!empty($mensalidadeIds)) {
                Transaction::where('source_type', 'mensalidade')
                    ->whereIn('source_id', $mensalidadeIds)
                    ->delete();

                if (\Illuminate\Support\Facades\Schema::hasTable('pagamento_transacoes')) {
                    \Illuminate\Support\Facades\DB::table('pagamento_transacoes')->whereIn('mensalidade_id', $mensalidadeIds)->delete();
                }
                if (\Illuminate\Support\Facades\Schema::hasTable('pagamento_historico')) {
                    \Illuminate\Support\Facades\DB::table('pagamento_historico')->whereIn('mensalidade_id', $mensalidadeIds)->delete();
                }

                Mensalidade::whereIn('id', $mensalidadeIds)->delete();
            }
        });
    }
}
