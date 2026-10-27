<?php

namespace App\Http\Controllers;

use App\Enums\MensalidadeStatus;
use App\Enums\PagamentoOrigem;
use App\Models\Aluno;
use App\Models\Mensalidade;
use App\Models\MonthlyClosure;
use App\Models\PagamentoTransacao;
use App\Models\Transaction;
use App\Services\PagamentoService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MensalidadeController extends Controller
{
    public function __construct(
        private readonly PagamentoService $pagamentoService,
    ) {}

    public function index(Request $request)
    {
        $query = Mensalidade::whereHas('aluno')->with('aluno')->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('mes')) {
            $query->where('mes_referencia', $request->mes);
        }

        if ($request->filled('q')) {
            $q = $request->input('q');
            $query->where(function ($w) use ($q) {
                $w->where('mes_referencia', 'like', "%{$q}%")
                    ->orWhereHas('aluno', function ($aluno) use ($q) {
                        $aluno->where('nome', 'like', "%{$q}%");
                    });
            });
        }

        if ($request->has('page')) {
            $paginated = $query->paginate((int) $request->input('per_page', 20))->withQueryString();

            return response()->json([
                'data' => $paginated->items(),
                'total' => $paginated->total(),
                'page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'last_page' => $paginated->lastPage(),
            ]);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'aluno_id' => 'required|exists:alunos,id',
            'mes_referencia' => 'required|string|max:7',
            'valor' => 'required|numeric|min:0',
            'data_vencimento' => 'required|date',
            'data_pagamento' => 'nullable|date',
            'status' => 'required|in:pendente,pago,atrasado',
            'forma_pagamento' => 'nullable|in:pix,debito,credito',
            'origem' => 'nullable|in:mercadopago,caixa,admin,pix_manual,dinheiro,transferencia',
        ]);

        $jaExiste = Mensalidade::where('aluno_id', $validated['aluno_id'])
            ->where('mes_referencia', $validated['mes_referencia'])
            ->exists();

        if ($jaExiste) {
            return response()->json([
                'message' => 'Já existe uma mensalidade para este aluno no período informado.',
            ], 409);
        }

        $validated['valor_cobrado'] = $validated['valor_cobrado'] ?? $validated['valor'];

        return Mensalidade::create($validated);
    }

    public function show(Mensalidade $mensalidade)
    {
        return $mensalidade->load('aluno');
    }

    public function update(Request $request, Mensalidade $mensalidade)
    {
        $validated = $request->validate([
            'aluno_id' => 'sometimes|exists:alunos,id',
            'mes_referencia' => 'sometimes|string|max:7',
            'valor' => 'sometimes|numeric|min:0',
            'data_vencimento' => 'sometimes|date',
            'data_pagamento' => 'nullable|date',
            'status' => 'sometimes|in:pendente,pago,atrasado',
            'forma_pagamento' => 'nullable|in:pix,debito,credito',
            'origem' => 'nullable|in:mercadopago,caixa,admin,pix_manual,dinheiro,transferencia',
        ]);

        if (array_key_exists('valor', $validated)
            && ($mensalidade->origem !== PagamentoOrigem::MercadoPago->value || $mensalidade->valor_cobrado === null)) {
            $validated['valor_cobrado'] = $validated['valor'];
        }

        $mensalidade->update($validated);
        return $mensalidade;
    }

    public function gerarProximoMes(Request $request): JsonResponse
    {
        $mes = $request->input('mes_referencia');
        $diaVencimento = (int) $request->input('dia_vencimento', 10);

        if (!$mes || !preg_match('/^\d{2}\/\d{4}$/', $mes)) {
            return response()->json(['message' => 'Formato inválido. Use MM/YYYY.'], 422);
        }

        [$mm, $yyyy] = explode('/', $mes);
        $vencimento = sprintf('%d-%02d-%02d', $yyyy, $mm, $diaVencimento);

        $alunos = Aluno::where('status', 'ativo')
            ->where('valor_mensalidade', '>', 0)
            ->get();

        $criadas = 0;

        foreach ($alunos as $aluno) {
            $jaExiste = Mensalidade::where('aluno_id', $aluno->id)
                ->where('mes_referencia', $mes)
                ->exists();

            if ($jaExiste) {
                continue;
            }

            Mensalidade::create([
                'aluno_id' => $aluno->id,
                'mes_referencia' => $mes,
                'valor' => $aluno->valor_mensalidade,
                'valor_cobrado' => $aluno->valor_mensalidade,
                'data_vencimento' => $vencimento,
                'status' => 'pendente',
            ]);

            $criadas++;
        }

        return response()->json([
            'mes_referencia' => $mes,
            'criadas' => $criadas,
        ]);
    }

    public function pagar(Request $request, Mensalidade $mensalidade): JsonResponse
    {
        if ($mensalidade->isPago()) {
            return response()->json(['message' => 'Mensalidade já está paga.'], 409);
        }

        $validated = $request->validate([
            'forma_pagamento' => 'nullable|in:pix,debito,credito',
            'origem' => 'nullable|in:mercadopago,caixa,admin,pix_manual,dinheiro,transferencia',
            'data_pagamento' => 'nullable|date',
        ]);

        $dataPagamento = $validated['data_pagamento'] ?? now()->format('Y-m-d');

        $mesFechado = MonthlyClosure::where('month', Carbon::parse($dataPagamento)->month)
            ->where('year', Carbon::parse($dataPagamento)->year)
            ->exists();

        if ($mesFechado) {
            return response()->json([
                'message' => 'O mês do pagamento já foi finalizado. Não é possível registrar recebimentos neste mês.',
            ], 422);
        }

        DB::transaction(function () use ($mensalidade, $validated, $dataPagamento) {
            $mensalidade->update([
                'status' => MensalidadeStatus::Pago->value,
                'data_pagamento' => $dataPagamento,
                'forma_pagamento' => $validated['forma_pagamento'] ?? null,
                'origem' => $validated['origem'] ?? PagamentoOrigem::Caixa->value,
                'valor_cobrado' => $mensalidade->valor_cobrado ?? $mensalidade->valor,
            ]);

            $mensalidade->fresh()->loadMissing('aluno');
            $this->pagamentoService->sincronizarMensalidadeNoCaixa($mensalidade);

            $pagamento = PagamentoTransacao::where('mensalidade_id', $mensalidade->id)
                ->orderByDesc('id')
                ->first();

            if ($pagamento) {
                $pagamento->update([
                    'status' => 'approved',
                    'payment_method' => $validated['forma_pagamento']
                        ?? $pagamento->payment_method,
                ]);
            } else {
                PagamentoTransacao::create([
                    'mensalidade_id' => $mensalidade->id,
                    'origem' => $validated['origem'] ?? PagamentoOrigem::Caixa->value,
                    'status' => 'approved',
                    'payment_method' => $this->pagamentoService->formaPagamentoParaAuditoria(
                        $validated['forma_pagamento'] ?? null,
                    ),
                    'data_aprovacao' => now(),
                ]);
            }
        });

        return $mensalidade->fresh()->load('aluno');
    }

    public function sincronizarFluxoCaixa(): JsonResponse
    {
        $mensalidadesPagas = Mensalidade::with('aluno')
            ->where('status', MensalidadeStatus::Pago->value)
            ->get();

        $sincronizadas = 0;
        $ignoradas = 0;

        foreach ($mensalidadesPagas as $mensalidade) {
            $jaExiste = Transaction::where('source_type', 'mensalidade')
                ->where('source_id', $mensalidade->id)
                ->exists();

            if ($jaExiste) {
                continue;
            }

            $dataPagamento = $mensalidade->data_pagamento?->format('Y-m-d') ?? now()->format('Y-m-d');

            $mesFechado = MonthlyClosure::where('month', Carbon::parse($dataPagamento)->month)
                ->where('year', Carbon::parse($dataPagamento)->year)
                ->exists();

            if ($mesFechado) {
                $ignoradas++;
                continue;
            }

            $this->pagamentoService->sincronizarMensalidadeNoCaixa($mensalidade);
            $sincronizadas++;
        }

        return response()->json([
            'sincronizadas' => $sincronizadas,
            'ignoradas' => $ignoradas,
        ]);
    }

    public function verificarVencidas(): JsonResponse
    {
        $hoje = now()->format('Y-m-d');
        $vencidas = Mensalidade::where('status', 'pendente')
            ->where('data_vencimento', '<', $hoje)
            ->get();

        foreach ($vencidas as $m) {
            $m->update(['status' => 'atrasado']);
        }

        $alunoIds = $vencidas->pluck('aluno_id')->unique();
        foreach ($alunoIds as $alunoId) {
            $totalAtrasadas = Mensalidade::where('aluno_id', $alunoId)
                ->where('status', 'atrasado')
                ->where('data_vencimento', '<', $hoje)
                ->count();

            $diasMaiorAtraso = Mensalidade::where('aluno_id', $alunoId)
                ->where('status', 'atrasado')
                ->where('data_vencimento', '<', $hoje)
                ->min('data_vencimento');

            $situacao = 'em_atraso';
            if ($totalAtrasadas >= 3 || ($diasMaiorAtraso && now()->diffInDays($diasMaiorAtraso) > 90)) {
                $situacao = 'inadimplente';
            }

            Aluno::where('id', $alunoId)->update(['situacao' => $situacao]);
        }

        $alunosEmDia = Aluno::whereIn('situacao', ['em_atraso', 'inadimplente'])
            ->whereDoesntHave('mensalidades', function ($q) use ($hoje) {
                $q->where('status', 'atrasado')->where('data_vencimento', '<', $hoje);
            })
            ->pluck('id');

        if ($alunosEmDia->isNotEmpty()) {
            Aluno::whereIn('id', $alunosEmDia)->update(['situacao' => 'em_dia']);
        }

        return response()->json([
            'atualizadas' => $vencidas->count(),
            'regularizadas' => $alunosEmDia->count(),
        ]);
    }

    public function destroy(Mensalidade $mensalidade)
    {
        DB::transaction(function () use ($mensalidade) {
            Transaction::where('source_type', 'mensalidade')
                ->where('source_id', $mensalidade->id)
                ->delete();

            if (\Illuminate\Support\Facades\Schema::hasTable('pagamento_transacoes')) {
                DB::table('pagamento_transacoes')->where('mensalidade_id', $mensalidade->id)->delete();
            }
            if (\Illuminate\Support\Facades\Schema::hasTable('pagamento_historico')) {
                DB::table('pagamento_historico')->where('mensalidade_id', $mensalidade->id)->delete();
            }

            $mensalidade->delete();
        });

        return response()->noContent();
    }
}
