<?php

namespace App\Http\Controllers;

use App\Models\Aluno;
use App\Models\Associado;
use App\Models\LogAcesso;
use App\Models\Mensalidade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AssociadoController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:255',
            'cpf' => 'required|string|size:11|unique:associados,cpf',
            'email' => 'required|email|max:255|unique:associados,email',
            'telefone' => 'required|string|max:20',
            'nome_aluno' => 'nullable|string|max:255',
            'password' => 'required|string|min:6',
        ]);

        $validated['status'] = 'ativo';

        $aluno = $this->buscarAlunoPorCpf($validated['cpf']);
        if ($aluno) {
            $validated['aluno_id'] = $aluno->id;
            $validated['nome_aluno'] ??= $this->formatarNomesAlunos($aluno);
        }

        $associado = Associado::create($validated);

        $token = Str::random(60);
        $associado->forceFill(['api_token' => $token])->save();

        $this->registrarLogAcesso($request, LogAcesso::EVENTO_CADASTRO, $associado);

        $alunos = $this->buscarTodosAlunosPorCpf($associado->cpf);

        return response()->json([
            'success' => true,
            'message' => 'Cadastro realizado com sucesso!',
            'associado' => [
                'id' => $associado->id,
                'nome' => $associado->nome,
                'email' => $associado->email,
                'telefone' => $associado->telefone,
                'cpf' => $associado->cpf,
                'nome_aluno' => $associado->nome_aluno,
                'alunos' => $alunos->map(fn ($al) => ['nome' => $al->nome, 'id' => $al->id])->values()->toArray(),
                'status' => $associado->status,
                'created_at' => $associado->created_at->format('d/m/Y'),
            ],
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $associado = Associado::where('email', $request->email)->first();

        if (!$associado) {
            $this->registrarLogAcesso(
                $request,
                LogAcesso::EVENTO_LOGIN_FALHA,
                null,
                $request->email,
                'email_nao_encontrado'
            );

            return response()->json([
                'success' => false,
                'message' => 'E-mail ou senha inválidos.',
            ], 401);
        }

        $password = $request->password;

        // Tenta verificar com a senha fornecida
        $match = Hash::check($password, $associado->password);

        // Se não match, tenta limpar não-dígitos (CPF formatado)
        if (!$match) {
            $cleaned = preg_replace('/\D/', '', $password);
            if ($cleaned !== $password) {
                $match = Hash::check($cleaned, $associado->password);
            }
        }

        // Fallback para senhas armazenadas como plain text (registros antigos)
        if (!$match && !$this->isBcryptHash($associado->password)) {
            $match = $password === $associado->password;
            if ($match) {
                $associado->forceFill(['password' => bcrypt($password)])->save();
            }
        }

        if (!$match) {
            $this->registrarLogAcesso(
                $request,
                LogAcesso::EVENTO_LOGIN_FALHA,
                $associado,
                null,
                'senha_invalida'
            );

            return response()->json([
                'success' => false,
                'message' => 'E-mail ou senha inválidos.',
            ], 401);
        }

        if (!$associado->aluno_id) {
            $aluno = $this->buscarAlunoPorCpf($associado->cpf);
            if ($aluno) {
                $associado->forceFill(['aluno_id' => $aluno->id, 'nome_aluno' => $this->formatarNomesAlunos($aluno)])->save();
                $associado->refresh();
            }
        }

        $token = Str::random(60);
        $associado->forceFill(['api_token' => $token])->save();

        $this->registrarLogAcesso($request, LogAcesso::EVENTO_LOGIN, $associado);

        $alunos = $this->buscarTodosAlunosPorCpf($associado->cpf);

        return response()->json([
            'success' => true,
            'message' => 'Login realizado com sucesso.',
            'associado' => [
                'id' => $associado->id,
                'nome' => $associado->nome,
                'email' => $associado->email,
                'telefone' => $associado->telefone,
                'cpf' => $associado->cpf,
                'nome_aluno' => $associado->nome_aluno,
                'alunos' => $alunos->map(fn ($al) => ['nome' => $al->nome, 'id' => $al->id])->values()->toArray(),
                'status' => $associado->status,
                'created_at' => $associado->created_at->format('d/m/Y'),
            ],
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $associado = $this->getAuthenticated($request);

        if ($associado) {
            $this->registrarLogAcesso($request, LogAcesso::EVENTO_LOGOUT, $associado);
            $associado->forceFill(['api_token' => null])->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Sessão encerrada com sucesso.',
        ]);
    }

    public function show(Request $request): JsonResponse
    {
        $associado = $this->getAuthenticated($request);

        if (!$associado) {
            return response()->json(['success' => false, 'message' => 'Não autorizado.'], 401);
        }

        $alunos = $this->buscarTodosAlunosPorCpf($associado->cpf);

        return response()->json([
            'success' => true,
            'associado' => [
                'id' => $associado->id,
                'nome' => $associado->nome,
                'email' => $associado->email,
                'telefone' => $associado->telefone,
                'cpf' => $associado->cpf,
                'nome_aluno' => $associado->nome_aluno,
                'alunos' => $alunos->map(fn ($al) => ['nome' => $al->nome, 'id' => $al->id])->values()->toArray(),
                'status' => $associado->status,
                'created_at' => $associado->created_at->format('d/m/Y'),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $associado = $this->getAuthenticated($request);

        if (!$associado) {
            return response()->json(['success' => false, 'message' => 'Não autorizado.'], 401);
        }

        $validated = $request->validate([
            'nome' => 'sometimes|string|max:255',
            'telefone' => 'sometimes|string|max:20',
            'nome_aluno' => 'sometimes|nullable|string|max:255',
            'email' => 'sometimes|email|max:255|unique:associados,email,' . $associado->id,
        ]);

        $associado->update($validated);

        if (!empty($validated['email'])) {
            $cpf = $associado->cpf;
            $cpfFormatado = preg_replace('/(\d{3})(\d{3})(\d{3})(\d{2})/', '$1.$2.$3-$4', $cpf);
            Aluno::where(function ($q) use ($cpf, $cpfFormatado) {
                    $q->where('cpf_responsavel', $cpf)
                      ->orWhere('cpf_responsavel', $cpfFormatado);
                })
                ->where(function ($q) use ($validated) {
                    $q->where('email', '!=', $validated['email'])
                      ->orWhere('email_responsavel', '!=', $validated['email'])
                      ->orWhereNull('email_responsavel');
                })
                ->update(['email_responsavel' => $validated['email']]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Dados atualizados com sucesso.',
        ]);
    }

    public function mensalidades(Request $request): JsonResponse
    {
        $associado = $this->getAuthenticated($request);

        if (!$associado) {
            return response()->json(['success' => false, 'message' => 'Não autorizado.'], 401);
        }

        $alunos = $this->buscarTodosAlunosPorCpf($associado->cpf);

        if ($alunos->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $alunoIds = $alunos->pluck('id')->toArray();

        $mensalidades = Mensalidade::with('aluno')
            ->whereIn('aluno_id', $alunoIds)
            ->orderBy('data_vencimento', 'desc')
            ->get()
            ->map(function ($m) {
                return [
                    'id' => $m->id,
                    'aluno_id' => $m->aluno_id,
                    'mes_referencia' => $m->mes_referencia,
                    'valor' => $m->valor,
                    'valor_cobrado' => $m->valor_cobrado,
                    'data_vencimento' => $m->data_vencimento->format('d/m/Y'),
                    'data_pagamento' => $m->data_pagamento?->format('d/m/Y'),
                    'status' => $m->status,
                    'forma_pagamento' => $m->forma_pagamento,
                    'origem' => $m->origem,
                    'aluno_nome' => $m->aluno?->nome,
                    'aluno_responsavel' => $m->aluno?->responsavel,
                    'aluno_sexo' => $m->aluno?->sexo,
                    'created_at' => $m->created_at->format('d/m/Y H:i'),
                ];
            });

        return response()->json(['success' => true, 'data' => $mensalidades]);
    }

    public function listAll(): JsonResponse
    {
        $associados = Associado::with('aluno:id,nome')
            ->orderBy('created_at', 'desc')
            ->get();

        $cpfVariations = [];
        $cpfMap = [];
        foreach ($associados as $a) {
            $clean = preg_replace('/\D/', '', $a->cpf);
            $formatted = preg_replace('/(\d{3})(\d{3})(\d{3})(\d{2})/', '$1.$2.$3-$4', $clean);
            $cpfVariations[$clean] = true;
            $cpfVariations[$formatted] = true;
            $cpfMap[$a->cpf] = ['clean' => $clean, 'formatted' => $formatted];
        }

        $allAlunos = Aluno::whereIn('cpf_responsavel', array_keys($cpfVariations))
            ->get()
            ->groupBy('cpf_responsavel');

        $result = $associados->map(fn ($a) => [
            'id' => $a->id,
            'nome' => $a->nome,
            'cpf' => $a->cpf,
            'email' => $a->email,
            'telefone' => $a->telefone,
            'nome_aluno' => $a->nome_aluno,
            'aluno_nome' => $a->aluno?->nome,
            'alunos' => ($allAlunos[$cpfMap[$a->cpf]['clean']] ?? $allAlunos[$cpfMap[$a->cpf]['formatted']] ?? collect())
                ->map(fn ($al) => ['nome' => $al->nome])
                ->values()
                ->toArray(),
            'status' => $a->status,
            'created_at' => $a->created_at->format('d/m/Y'),
        ]);

        return response()->json(['data' => $result]);
    }

    public function destroy($id): JsonResponse
    {
        $associado = Associado::find($id);

        if (!$associado) {
            return response()->json(['success' => false, 'message' => 'Associado não encontrado.'], 404);
        }

        $associado->delete();

        return response()->json([
            'success' => true,
            'message' => 'Associado excluído com sucesso.',
        ]);
    }

    private function isBcryptHash(string $value): bool
    {
        return strlen($value) === 60 && str_starts_with($value, '$2y$');
    }

    private function buscarAlunoPorCpf(string $cpf): ?Aluno
    {
        $cpfLimpo = preg_replace('/\D/', '', $cpf);
        $cpfFormatado = preg_replace('/(\d{3})(\d{3})(\d{3})(\d{2})/', '$1.$2.$3-$4', $cpfLimpo);
        return Aluno::where('cpf_responsavel', $cpfLimpo)
            ->orWhere('cpf_responsavel', $cpfFormatado)
            ->first();
    }

    private function buscarTodosAlunosPorCpf(string $cpf): \Illuminate\Support\Collection
    {
        $cpfLimpo = preg_replace('/\D/', '', $cpf);
        $cpfFormatado = preg_replace('/(\d{3})(\d{3})(\d{3})(\d{2})/', '$1.$2.$3-$4', $cpfLimpo);
        return Aluno::where('cpf_responsavel', $cpfLimpo)
            ->orWhere('cpf_responsavel', $cpfFormatado)
            ->get();
    }

    private function formatarNomesAlunos(Aluno $aluno): string
    {
        $cpfLimpo = preg_replace('/\D/', '', $aluno->cpf_responsavel);
        $cpfFormatado = preg_replace('/(\d{3})(\d{3})(\d{3})(\d{2})/', '$1.$2.$3-$4', $cpfLimpo);
        $alunos = Aluno::where('cpf_responsavel', $cpfLimpo)
            ->orWhere('cpf_responsavel', $cpfFormatado)
            ->get();
        return $alunos->map(fn ($a) => explode(' ', trim($a->nome))[0])->implode(' / ');
    }

    private function getAuthenticated(Request $request): ?Associado
    {
        $token = $request->bearerToken();
        if (!$token) return null;
        return Associado::where('api_token', $token)->first();
    }

    private function registrarLogAcesso(
        Request $request,
        string $evento,
        ?Associado $associado = null,
        ?string $email = null,
        ?string $motivo = null
    ): void {
        try {
            LogAcesso::create([
                'associado_id' => $associado?->id,
                'nome' => $associado?->nome,
                'email' => $associado?->email ?? $email,
                'cpf' => $associado?->cpf,
                'evento' => $evento,
                'motivo' => $motivo,
                'ip' => $request->ip(),
                'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Falha ao registrar log de acesso', [
                'evento' => $evento,
                'erro' => $e->getMessage(),
            ]);
        }
    }
}
