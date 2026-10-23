<?php

namespace App\Http\Controllers;

use App\Models\Aluno;
use App\Models\Associado;
use App\Models\Mensalidade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AlunoController extends Controller
{

    public function checkCpf(string $cpf, Request $request): JsonResponse
    {
        $query = Aluno::where('cpf', $cpf);
        if ($ignoreId = $request->query('ignore_id')) {
            $query->where('id', '!=', $ignoreId);
        }
        return response()->json(['exists' => $query->exists()]);
    }

    public function index()
    {
        return Aluno::orderBy('created_at', 'desc')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:120',
            'sexo' => 'required|in:masculino,feminino',
            'cpf' => 'nullable|string|max:14|unique:alunos,cpf',
            'data_nascimento' => 'required|string|max:10',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'cep' => 'required|string|max:9',
            'logradouro' => 'required|string|max:255',
            'numero' => 'required|string|max:20',
            'bairro' => 'required|string|max:255',
            'cidade' => 'required|string|max:255',
            'uf' => 'required|string|max:2',
            'nome_pai' => 'nullable|string|max:120',
            'nome_mae' => 'nullable|string|max:120',
            'responsavel' => 'required|string|max:255',
            'cpf_responsavel' => 'nullable|string|max:14',
            'telefone_responsavel' => 'nullable|string|max:20',
            'email_responsavel' => 'nullable|email|max:255',
            'turma' => 'required|string|max:50',
            'status' => 'required|in:ativo,inativo',
            'situacao' => 'required|in:em_dia,em_atraso,inadimplente',
            'valor_mensalidade' => 'nullable|numeric|min:0',
            'dia_vencimento' => 'nullable|integer|min:1|max:31',
            'ano_letivo' => 'nullable|string|max:4',
        ]);

        $aluno = DB::transaction(function () use ($validated) {
            $aluno = Aluno::create($validated);

            if (($validated['valor_mensalidade'] ?? 0) > 0) {
                $this->criarMensalidadeInicial($aluno);
            }

            return $aluno;
        });

        $this->sincronizarAssociado($aluno);

        return $aluno->load('mensalidades');
    }

    private function criarMensalidadeInicial(Aluno $aluno): void
    {
        $agora = now();
        $dia = $aluno->dia_vencimento ?? 10;

        $mesRef = $agora->format('m/Y');

        $jaExiste = Mensalidade::where('aluno_id', $aluno->id)
            ->where('mes_referencia', $mesRef)
            ->exists();

        if ($jaExiste) {
            return;
        }

        Mensalidade::create([
            'aluno_id' => $aluno->id,
            'mes_referencia' => $mesRef,
            'valor' => $aluno->valor_mensalidade,
            'data_vencimento' => $agora->format('Y-m') . sprintf('-%02d', $dia),
            'status' => 'pendente',
        ]);

        Log::info('Aluno: Mensalidade inicial criada', [
            'aluno_id' => $aluno->id,
            'mes_referencia' => $mesRef,
        ]);
    }

    public function show(Aluno $aluno)
    {
        return $aluno->load('mensalidades');
    }

    public function update(Request $request, Aluno $aluno)
    {
        $validated = $request->validate([
            'nome' => 'sometimes|string|max:120',
            'sexo' => 'sometimes|in:masculino,feminino',
            'cpf' => 'nullable|string|max:14|unique:alunos,cpf,' . $aluno->id,
            'data_nascimento' => 'sometimes|string|max:10',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'cep' => 'sometimes|required|string|max:9',
            'logradouro' => 'sometimes|required|string|max:255',
            'numero' => 'sometimes|required|string|max:20',
            'bairro' => 'sometimes|required|string|max:255',
            'cidade' => 'sometimes|required|string|max:255',
            'uf' => 'sometimes|required|string|max:2',
            'nome_pai' => 'nullable|string|max:120',
            'nome_mae' => 'nullable|string|max:120',
            'responsavel' => 'sometimes|string|max:255',
            'cpf_responsavel' => 'nullable|string|max:14',
            'telefone_responsavel' => 'nullable|string|max:20',
            'email_responsavel' => 'nullable|email|max:255',
            'turma' => 'sometimes|string|max:50',
            'status' => 'sometimes|in:ativo,inativo',
            'situacao' => 'sometimes|in:em_dia,em_atraso,inadimplente',
            'valor_mensalidade' => 'nullable|numeric|min:0',
            'dia_vencimento' => 'nullable|integer|min:1|max:31',
            'ano_letivo' => 'nullable|string|max:4',
        ]);

        $cpfResponsavelAnterior = $aluno->cpf_responsavel;

        $aluno->update($validated);
        $this->sincronizarAssociado($aluno, $cpfResponsavelAnterior);
        return $aluno;
    }

    public function extrato(Aluno $aluno): JsonResponse
    {
        $mensalidades = $aluno->mensalidades()->orderBy('created_at', 'desc')->get();

        $totalPago = $mensalidades->where('status', 'pago')->sum('valor');
        $totalPendente = $mensalidades->whereIn('status', ['pendente', 'atrasado'])->sum('valor');

        return response()->json([
            'aluno' => $aluno,
            'mensalidades' => $mensalidades,
            'total_pago' => $totalPago,
            'total_pendente' => $totalPendente,
            'qtd_pagas' => $mensalidades->where('status', 'pago')->count(),
            'qtd_pendentes' => $mensalidades->whereIn('status', ['pendente', 'atrasado'])->count(),
        ]);
    }

    public function destroy(Aluno $aluno)
    {
        $aluno->delete();
        return response()->noContent();
    }

    private function sincronizarAssociado(Aluno $aluno, ?string $cpfResponsavelAnterior = null): void
    {
        $cpfAtual = preg_replace('/\D/', '', (string) $aluno->cpf_responsavel);
        $cpfAnterior = preg_replace('/\D/', '', (string) $cpfResponsavelAnterior);

        if ($cpfAtual === '' && $cpfAnterior === '') return;

        $associado = Associado::where('aluno_id', $aluno->id)->first();

        if (!$associado) {
            $cpfsBusca = array_values(array_unique(array_filter([$cpfAnterior, $cpfAtual])));

            if (!empty($cpfsBusca)) {
                $associado = Associado::whereIn('cpf', $cpfsBusca)->first();
            }
        }

        if (!$associado) return;

        $dados = [];

        if (!empty($aluno->responsavel) && $associado->nome !== $aluno->responsavel) {
            $dados['nome'] = $aluno->responsavel;
        }

        if ($cpfAtual !== '' && $associado->cpf !== $cpfAtual) {
            $cpfEmUso = Associado::where('cpf', $cpfAtual)
                ->where('id', '!=', $associado->id)
                ->exists();

            if (!$cpfEmUso) {
                $dados['cpf'] = $cpfAtual;

                $cpfAntigo = preg_replace('/\D/', '', (string) $associado->cpf);

                if ($cpfAntigo !== '' && $this->senhaDerivadaDoCpf($associado->password, $cpfAntigo)) {
                    $dados['password'] = $cpfAtual;
                }
            }
        }

        $email = $aluno->email_responsavel ?? $aluno->email;

        if (!empty($email) && $associado->email !== $email) {
            $emailEmUso = Associado::where('email', $email)
                ->where('id', '!=', $associado->id)
                ->exists();

            if (!$emailEmUso) {
                $dados['email'] = $email;
            }
        }

        if (!empty($dados)) {
            $associado->forceFill($dados)->save();
        }
    }

    private function senhaDerivadaDoCpf(?string $hash, string $cpf): bool
    {
        if (empty($hash)) {
            return false;
        }

        if (Hash::check($cpf, $hash)) {
            return true;
        }

        return strlen($cpf) >= 6 && Hash::check(substr($cpf, 0, 6), $hash);
    }
}
