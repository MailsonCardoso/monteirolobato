<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Aluno extends Model
{
    protected $fillable = [
        'nome', 'sexo', 'foto', 'cpf', 'data_nascimento', 'telefone', 'email', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf',
        'nome_mae', 'nome_pai',
        'responsavel', 'cpf_responsavel', 'telefone_responsavel', 'email_responsavel',
        'turma', 'status', 'situacao',
        'valor_mensalidade', 'dia_vencimento', 'ano_letivo',
        'cep_resp', 'logradouro_resp', 'numero_resp', 'bairro_resp', 'cidade_resp', 'parentesco_resp',
        'matricula',
    ];

    protected $appends = ['foto_url'];

    protected function casts(): array
    {
        return [
            'status' => 'string',
            'situacao' => 'string',
        ];
    }

    public function getFotoUrlAttribute(): ?string
    {
        if (!$this->foto) {
            return null;
        }
        if (str_starts_with($this->foto, 'http://') || str_starts_with($this->foto, 'https://')) {
            return $this->foto;
        }
        return url('api/alunos/' . $this->id . '/foto');
    }

    public function mensalidades(): HasMany
    {
        return $this->hasMany(Mensalidade::class);
    }

    protected static function booted(): void
    {
        static::deleting(function (Aluno $aluno) {
            // Deletar foto do storage se existir
            if ($aluno->foto) {
                Storage::disk('public')->delete($aluno->foto);
            }

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
