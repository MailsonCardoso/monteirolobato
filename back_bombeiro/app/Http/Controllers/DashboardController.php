<?php

namespace App\Http\Controllers;

use App\Models\Aluno;
use App\Models\Expense;
use App\Models\Mensalidade;
use App\Models\Revenue;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function financeiro(Request $request): JsonResponse
    {
        $hoje = now();
        $inicioJanela = $hoje->copy()->subMonths(5)->startOfMonth();
        $fimJanela = $hoje->copy()->endOfMonth();

        $resumo = [
            'pago' => ['qtd' => 0, 'total' => 0],
            'pendente' => ['qtd' => 0, 'total' => 0],
            'atrasado' => ['qtd' => 0, 'total' => 0],
        ];
        Mensalidade::query()
            ->join('alunos', 'mensalidades.aluno_id', '=', 'alunos.id')
            ->selectRaw("mensalidades.status, COUNT(*) as qtd, COALESCE(SUM(mensalidades.valor), 0) as total")
            ->whereIn('mensalidades.status', ['pago', 'pendente', 'atrasado'])
            ->groupBy('mensalidades.status')
            ->get()
            ->each(function ($item) use (&$resumo) {
                $resumo[$item->status] = [
                    'qtd' => (int) $item->qtd,
                    'total' => (float) $item->total,
                ];
            });

        $alunosAtivos = Aluno::where('status', 'ativo')->count();
        $alunosInadimplentes = Aluno::whereIn('situacao', ['inadimplente', 'em_atraso'])->count();

        $mensalidadesPorMes = Mensalidade::query()
            ->join('alunos', 'mensalidades.aluno_id', '=', 'alunos.id')
            ->selectRaw("DATE_FORMAT(mensalidades.data_pagamento, '%Y-%m') as mes, COALESCE(SUM(mensalidades.valor), 0) as total")
            ->where('mensalidades.status', 'pago')
            ->whereNotNull('mensalidades.data_pagamento')
            ->whereBetween('mensalidades.data_pagamento', [$inicioJanela, $fimJanela])
            ->groupByRaw("DATE_FORMAT(mensalidades.data_pagamento, '%Y-%m')")
            ->pluck('total', 'mes')
            ->map(fn ($valor) => (float) $valor)
            ->toArray();

        $entradasPorMes = Transaction::query()
            ->selectRaw("DATE_FORMAT(date, '%Y-%m') as mes, COALESCE(SUM(amount), 0) as total")
            ->where('type', 'entrada')
            ->whereBetween('date', [$inicioJanela, $fimJanela])
            ->where(function ($q) {
                $q->whereNull('source_type')->orWhere('source_type', '!=', 'mensalidade');
            })
            ->groupByRaw("DATE_FORMAT(date, '%Y-%m')")
            ->pluck('total', 'mes')
            ->map(fn ($valor) => (float) $valor)
            ->toArray();

        $saidasPorMes = Transaction::query()
            ->selectRaw("DATE_FORMAT(date, '%Y-%m') as mes, COALESCE(SUM(amount), 0) as total")
            ->where('type', 'saida')
            ->whereBetween('date', [$inicioJanela, $fimJanela])
            ->groupByRaw("DATE_FORMAT(date, '%Y-%m')")
            ->pluck('total', 'mes')
            ->map(fn ($valor) => (float) $valor)
            ->toArray();

        $chaveAtual = $hoje->format('Y-m');
        $receitaMensalidades = $mensalidadesPorMes[$chaveAtual] ?? 0;
        $receitaOutras = $entradasPorMes[$chaveAtual] ?? 0;
        $despesasMes = $saidasPorMes[$chaveAtual] ?? 0;

        $receitaPrevista = $resumo['pendente']['total'] + $resumo['atrasado']['total'];

        $receitaPendenteOutras = Revenue::where('status', 'pendente')->sum('valor');

        $despesaPendente = Expense::whereIn('status', ['pendente', 'atrasado'])->sum('valor');

        $receitasMensais = [];
        for ($i = 5; $i >= 0; $i--) {
            $mes = $hoje->copy()->subMonths($i);
            $chave = $mes->format('Y-m');
            $receitasMensais[] = [
                'mes' => $mes->format('M/Y'),
                'receita' => ($mensalidadesPorMes[$chave] ?? 0) + ($entradasPorMes[$chave] ?? 0),
                'despesa' => $saidasPorMes[$chave] ?? 0,
            ];
        }

        return response()->json([
            'total_pago' => $resumo['pago']['total'] + Revenue::where('status', 'recebido')->sum('valor'),
            'total_pendente' => $receitaPrevista + $receitaPendenteOutras,
            'total_vencido' => $resumo['atrasado']['total'],
            'qtd_pagas' => $resumo['pago']['qtd'],
            'qtd_pendentes' => $resumo['pendente']['qtd'],
            'qtd_vencidas' => $resumo['atrasado']['qtd'],
            'receita_mes' => $receitaMensalidades + $receitaOutras,
            'despesa_mes' => $despesasMes,
            'saldo_mes' => ($receitaMensalidades + $receitaOutras) - $despesasMes,
            'receita_prevista' => $receitaPrevista + $receitaPendenteOutras,
            'despesa_pendente' => $despesaPendente,
            'alunos_ativos' => $alunosAtivos,
            'alunos_inadimplentes' => $alunosInadimplentes,
            'receitas_mensais' => $receitasMensais,
            'perc_inadimplencia' => $alunosAtivos > 0
                ? round(($alunosInadimplentes / $alunosAtivos) * 100, 1)
                : 0,
        ]);
    }

    public function mensalidades(): JsonResponse
    {
        $hoje = now();
        $diasNoMes = $hoje->daysInMonth;

        $porDiaQuery = Mensalidade::query()
            ->join('alunos', 'mensalidades.aluno_id', '=', 'alunos.id')
            ->selectRaw("DAY(mensalidades.data_vencimento) as dia, mensalidades.status, COUNT(*) as qtd")
            ->whereYear('mensalidades.data_vencimento', $hoje->year)
            ->whereMonth('mensalidades.data_vencimento', $hoje->month)
            ->groupByRaw('DAY(mensalidades.data_vencimento), mensalidades.status')
            ->get()
            ->groupBy('dia');

        $pagamentosPorDia = [];
        for ($i = 1; $i <= $diasNoMes; $i++) {
            $dia = (string) $i;
            $linhas = $porDiaQuery[$dia] ?? collect();
            $pagos = 0;
            $pendentes = 0;
            foreach ($linhas as $linha) {
                if ($linha->status === 'pago') {
                    $pagos = (int) $linha->qtd;
                } else {
                    $pendentes = (int) $linha->qtd;
                }
            }
            $pagamentosPorDia[] = [
                'dia' => str_pad($dia, 2, '0', STR_PAD_LEFT),
                'pagos' => $pagos,
                'pendentes' => $pendentes,
            ];
        }

        $receitaPorAno = Mensalidade::query()
            ->join('alunos', 'mensalidades.aluno_id', '=', 'alunos.id')
            ->selectRaw("YEAR(mensalidades.data_pagamento) as ano, COALESCE(SUM(mensalidades.valor), 0) as receita")
            ->where('mensalidades.status', 'pago')
            ->whereNotNull('mensalidades.data_pagamento')
            ->groupByRaw('YEAR(mensalidades.data_pagamento)')
            ->orderBy('ano')
            ->get()
            ->map(fn ($item) => ['ano' => (string) $item->ano, 'receita' => (float) $item->receita])
            ->all();

        $totalPendenteValor = Mensalidade::join('alunos', 'mensalidades.aluno_id', '=', 'alunos.id')
            ->where('mensalidades.status', '!=', 'pago')
            ->sum('mensalidades.valor');
        $alunosAtivos = Aluno::where('status', 'ativo')->count();
        $ticketMedio = $alunosAtivos > 0 ? $totalPendenteValor / $alunosAtivos : 0;

        return response()->json([
            'ticket_medio' => round($ticketMedio, 2),
            'receita_por_ano' => $receitaPorAno,
            'pagamentos_por_dia' => $pagamentosPorDia,
        ]);
    }
}
