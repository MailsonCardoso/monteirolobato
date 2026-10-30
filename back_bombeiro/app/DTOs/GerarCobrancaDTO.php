<?php

namespace App\DTOs;

use App\Models\Mensalidade;

final readonly class GerarCobrancaDTO
{
    public function __construct(
        public int $mensalidadeId,
        public string $externalReference,
        public string $titulo,
        public float $valor,
        public string $vencimento,
        public string $nomePagador,
        public string $emailPagador,
        public string $cpfPagador,
        public string $notificationUrl,
        public string $formaPagamento = 'pix',
        public ?string $cep = null,
        public ?string $logradouro = null,
        public ?string $numero = null,
        public ?string $bairro = null,
        public ?string $cidade = null,
        public ?string $uf = null,
    ) {}

    public static function fromMensalidade(Mensalidade $mensalidade, string $notificationUrl, string $formaPagamento = 'pix'): self
    {
        $aluno = $mensalidade->aluno;

        if (!$aluno) {
            throw new \RuntimeException('Mensalidade sem aluno vinculado.');
        }

        if ($formaPagamento === 'bolbradesco') {
            $cpf = preg_replace('/\D/', '', $aluno->cpf_responsavel ?? '');
            if (strlen($cpf) !== 11) {
                throw new \RuntimeException('CPF do responsável é obrigatório e deve ter 11 dígitos para gerar boleto.');
            }
            foreach (['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf'] as $campo) {
                if (empty($aluno->$campo)) {
                    throw new \RuntimeException("O campo {$campo} do aluno é obrigatório para gerar boleto.");
                }
            }
            if ((float) $mensalidade->valor < 2) {
                throw new \RuntimeException('O valor mínimo para gerar boleto é R$ 2,00.');
            }
        }

        return new self(
            mensalidadeId: $mensalidade->id,
            externalReference: self::gerarExternalReference($mensalidade),
            titulo: "Mensalidade {$mensalidade->mes_referencia} - {$aluno->nome}",
            valor: (float) $mensalidade->valor,
            vencimento: $mensalidade->data_vencimento->format('Y-m-d'),
            nomePagador: $aluno->responsavel ?: ($aluno->nome ?: 'Responsável do Aluno'),
            emailPagador: $aluno->email ?: ($aluno->email_responsavel ?: 'associado@monteirolobato.com.br'),
            cpfPagador: preg_replace('/\D/', '', $aluno->cpf_responsavel ?? ($aluno->cpf ?? '')),
            notificationUrl: $notificationUrl,
            formaPagamento: $formaPagamento,
            cep: $aluno->cep ?? null,
            logradouro: $aluno->logradouro ?? null,
            numero: $aluno->numero ?? null,
            bairro: $aluno->bairro ?? null,
            cidade: $aluno->cidade ?? null,
            uf: $aluno->uf ?? null,
        );
    }

    private static function gerarExternalReference(Mensalidade $mensalidade): string
    {
        $aluno = $mensalidade->aluno;
        $mes = str_replace('/', '_', $mensalidade->mes_referencia);

        return "MENSALIDADE_{$mensalidade->id}_{$mes}";
    }
}
