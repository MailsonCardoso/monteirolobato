<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GerarCobrancaRequest extends FormRequest
{
    public function authorize(): bool
    {
        $token = $this->bearerToken() ?: $this->query('token');
        if (!$token) {
            $header = $this->header('Authorization');
            if ($header && preg_match('/Bearer\s+(.*)$/i', $header, $matches)) {
                $token = $matches[1];
            }
        }

        // Se for requisição GET do navegador sem token, permite acesso (ex: consulta/redirecionamento)
        if ($this->isMethod('GET') && !$token) {
            return true;
        }

        if (!$token) {
            return false;
        }

        $associado = \App\Models\Associado::where('api_token', $token)->first();
        if (!$associado) {
            if (auth('sanctum')->check()) {
                return true;
            }
            return false;
        }

        $mensalidade = $this->route('mensalidade');
        if (!$mensalidade) {
            return false;
        }

        $cpfLimpo = preg_replace('/\D/', '', $associado->cpf);
        $cpfFormatado = preg_replace('/(\d{3})(\d{3})(\d{3})(\d{2})/', '$1.$2.$3-$4', $cpfLimpo);
        $alunos = \App\Models\Aluno::where('cpf_responsavel', $cpfLimpo)
            ->orWhere('cpf_responsavel', $cpfFormatado)
            ->pluck('id')
            ->toArray();

        return in_array($mensalidade->aluno_id, $alunos);
    }

    public function rules(): array
    {
        return [
            'forma_pagamento' => 'sometimes|in:pix,bolbradesco',
        ];
    }
}
