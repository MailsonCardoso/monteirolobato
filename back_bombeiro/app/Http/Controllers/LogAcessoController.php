<?php

namespace App\Http\Controllers;

use App\Models\LogAcesso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogAcessoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LogAcesso::query();

        if ($request->filled('data_inicio')) {
            $query->whereDate('created_at', '>=', $request->data_inicio);
        }

        if ($request->filled('data_fim')) {
            $query->whereDate('created_at', '<=', $request->data_fim);
        }

        if ($request->filled('evento')) {
            $query->where('evento', $request->evento);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $cpf = preg_replace('/\D/', '', $search);

            $query->where(function ($q) use ($search, $cpf) {
                $q->where('nome', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");

                if ($cpf !== '') {
                    $q->orWhere('cpf', 'like', "%{$cpf}%");
                }
            });
        }

        $resumo = [
            'total' => (clone $query)->count(),
            'logins' => (clone $query)->where('evento', LogAcesso::EVENTO_LOGIN)->count(),
            'falhas' => (clone $query)->where('evento', LogAcesso::EVENTO_LOGIN_FALHA)->count(),
            'associados' => (clone $query)->whereNotNull('associado_id')->distinct()->count('associado_id'),
            'ultimo_acesso' => (clone $query)->max('created_at'),
        ];

        $perPage = min((int) ($request->per_page ?: 50), 200);
        $logs = $query->orderByDesc('created_at')->orderByDesc('id')->paginate($perPage);

        $logs->getCollection()->transform(fn (LogAcesso $log) => [
            'id' => $log->id,
            'associado_id' => $log->associado_id,
            'nome' => $log->nome,
            'email' => $log->email,
            'cpf' => $log->cpf,
            'evento' => $log->evento,
            'motivo' => $log->motivo,
            'ip' => $log->ip,
            'user_agent' => $log->user_agent,
            'created_at' => $log->created_at?->toIso8601String(),
        ]);

        return response()->json(array_merge($logs->toArray(), [
            'resumo' => $resumo,
        ]));
    }
}
