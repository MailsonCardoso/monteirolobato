<?php

namespace App\Services;

use App\DTOs\GerarCobrancaDTO;
use App\Models\PagamentoTransacao;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MercadoPagoService
{
    private string $accessToken;
    private string $baseUrl;

    public function __construct()
    {
        $this->accessToken = (string) (config('services.mercadopago.access_token') ?? '');
        $isSandbox = (bool) config('services.mercadopago.sandbox', true);
        $this->baseUrl = $isSandbox
            ? 'https://api.mercadopago.com/sandbox/v1'
            : 'https://api.mercadopago.com/v1';
    }

    private function headers(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->accessToken,
            'Content-Type' => 'application/json',
            'X-Idempotency-Key' => uniqid('mp_', true),
        ];
    }

    public function criarCobranca(GerarCobrancaDTO $dto): array
    {
        if ($dto->formaPagamento === 'bolbradesco' && empty($dto->cpfPagador)) {
            throw new \RuntimeException('CPF do responsável é obrigatório para gerar boleto.');
        }

        if ($dto->formaPagamento === 'bolbradesco' && empty($dto->cep)) {
            throw new \RuntimeException(
                'Endereço completo do aluno é obrigatório para gerar boleto (CEP, rua, número, bairro, cidade e UF).'
            );
        }

        $parts = explode(' ', trim($dto->nomePagador), 2);
        $firstName = $parts[0] ?: $dto->nomePagador;
        $lastName = $parts[1] ?? $firstName;

        $payer = [
            'email' => !empty($dto->emailPagador) && filter_var($dto->emailPagador, FILTER_VALIDATE_EMAIL)
                ? $dto->emailPagador
                : 'associado@monteirolobato.com.br',
            'first_name' => $firstName,
            'last_name' => $lastName,
        ];

        $cpfLimpo = preg_replace('/\D/', '', (string) $dto->cpfPagador);
        if (!empty($cpfLimpo) && $this->validarCpf($cpfLimpo)) {
            $payer['identification'] = [
                'type' => 'CPF',
                'number' => $cpfLimpo,
            ];
        } elseif ($dto->formaPagamento === 'bolbradesco') {
            throw new \RuntimeException('CPF do responsável inválido para emissão de boleto.');
        }

        if ($dto->formaPagamento === 'bolbradesco') {
            $payer['address'] = [
                'zip_code' => $dto->cep,
                'street_name' => $dto->logradouro,
                'street_number' => $dto->numero,
                'neighborhood' => $dto->bairro,
                'city' => $dto->cidade,
                'federal_unit' => strtoupper($dto->uf ?? ''),
            ];
        }

        $payload = [
            'transaction_amount' => $dto->valor,
            'description' => $dto->titulo,
            'payment_method_id' => $dto->formaPagamento,
            'external_reference' => $dto->externalReference,
            'notification_url' => $dto->notificationUrl,
            'payer' => $payer,
        ];

        if ($dto->formaPagamento === 'bolbradesco') {
            $payload['date_of_expiration'] = now()->addDays(3)->format('Y-m-d\TH:i:s.v\Z');
        }

        Log::info('MercadoPago: Criando cobranca', [
            'external_reference' => $dto->externalReference,
            'mensalidade_id' => $dto->mensalidadeId,
            'valor' => $dto->valor,
        ]);

        Log::info('MercadoPago: Payload enviado', ['payload' => $payload]);

        $response = Http::withHeaders($this->headers())
            ->post("{$this->baseUrl}/payments", $payload);

        $this->logResponse('criar_cobranca', $response, $dto->externalReference);

        if (!$response->successful()) {
            Log::error('MercadoPago: Erro ao criar cobranca', [
                'status' => $response->status(),
                'body' => $response->body(),
                'external_reference' => $dto->externalReference,
            ]);
            throw new \RuntimeException(
                'Erro ao criar cobrança no Mercado Pago: ' . ($response->json()['message'] ?? $response->body())
            );
        }

        return $response->json();
    }

    public function consultarPagamento(string $paymentId): array
    {
        Log::info('MercadoPago: Consultando pagamento', ['payment_id' => $paymentId]);

        $response = Http::withHeaders($this->headers())
            ->get("{$this->baseUrl}/payments/{$paymentId}");

        $this->logResponse('consultar_pagamento', $response, $paymentId);

        if (!$response->successful()) {
            Log::error('MercadoPago: Erro ao consultar pagamento', [
                'payment_id' => $paymentId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \RuntimeException(
                'Erro ao consultar pagamento no Mercado Pago: ' . ($response->json()['message'] ?? $response->body())
            );
        }

        return $response->json();
    }

    public function criarPreference(GerarCobrancaDTO $dto): array
    {
        $payer = [
            'email' => !empty($dto->emailPagador) && filter_var($dto->emailPagador, FILTER_VALIDATE_EMAIL)
                ? $dto->emailPagador
                : 'associado@monteirolobato.com.br',
            'name' => $dto->nomePagador,
        ];

        $cpfLimpo = preg_replace('/\D/', '', (string) $dto->cpfPagador);
        if (!empty($cpfLimpo) && $this->validarCpf($cpfLimpo)) {
            $payer['identification'] = [
                'type' => 'CPF',
                'number' => $cpfLimpo,
            ];
        }

        $payload = [
            'external_reference' => $dto->externalReference,
            'notification_url' => $dto->notificationUrl,
            'statement_descriptor' => 'ESCOLA BOMBEIRO',
            'payer' => $payer,
            'payment_methods' => [
                'excluded_payment_types' => [
                    ['id' => 'credit_card'],
                    ['id' => 'debit_card'],
                ],
                'installments' => 1,
            ],
            'items' => [
                [
                    'id' => (string) $dto->mensalidadeId,
                    'title' => $dto->titulo,
                    'description' => $dto->titulo,
                    'quantity' => 1,
                    'unit_price' => $dto->valor,
                    'currency_id' => 'BRL',
                ],
            ],
            'back_urls' => [
                'success' => 'https://apacmcb2.platformx.com.br/associado/painel?tab=pagamentos',
                'failure' => 'https://apacmcb2.platformx.com.br/associado/painel?tab=pagamentos',
                'pending' => 'https://apacmcb2.platformx.com.br/associado/painel?tab=pagamentos',
            ],
        ];

        Log::info('MercadoPago: Criando preferencia', [
            'external_reference' => $dto->externalReference,
            'mensalidade_id' => $dto->mensalidadeId,
        ]);

        $response = Http::withHeaders($this->headers())
            ->post('https://api.mercadopago.com/checkout/preferences', $payload);

        $this->logResponse('criar_preference', $response, $dto->externalReference);

        if (!$response->successful()) {
            Log::error('MercadoPago: Erro ao criar preferencia', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \RuntimeException(
                'Erro ao criar preferência no Mercado Pago: ' . ($response->json()['message'] ?? $response->body())
            );
        }

        return $response->json();
    }

    public function validarWebhook(array $headers, string $body): bool
    {
        $secret = config('services.mercadopago.webhook_secret');
        if (empty($secret)) {
            return false;
        }

        $signatureRaw = $headers['x-signature'] ?? $headers['X-Signature'] ?? '';
        if (is_array($signatureRaw)) {
            $signatureRaw = implode(',', $signatureRaw);
        }
        if (empty($signatureRaw)) {
            Log::warning('MercadoPago: Webhook sem assinatura');
            return false;
        }

        preg_match('/v1=([a-f0-9]+)/i', $signatureRaw, $m);
        $signature = $m[1] ?? '';
        if (empty($signature)) {
            Log::warning('MercadoPago: Assinatura do webhook sem hash v1');
            return false;
        }

        $generated = hash_hmac('sha256', $body, $secret);
        $isValid = hash_equals($generated, $signature);

        if (!$isValid) {
            Log::warning('MercadoPago: Assinatura do webhook invalida');
        }

        return $isValid;
    }

    private function formatExpiration(string $vencimento): string
    {
        $date = \Carbon\Carbon::createFromFormat('Y-m-d', $vencimento);
        return $date->endOfDay()->utc()->format('Y-m-d\TH:i:s.u\Z');
    }

    private function logResponse(string $acao, Response $response, string $referencia): void
    {
        Log::info("MercadoPago: Resposta {$acao}", [
            'referencia' => $referencia,
            'status' => $response->status(),
            'body' => $response->json(),
        ]);
    }

    /**
     * Valida os dígitos verificadores de um CPF brasileiro (módulo 11).
     */
    private function validarCpf(string $cpf): bool
    {
        $cpf = preg_replace('/\D/', '', $cpf);
        if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) {
            return false;
        }

        for ($t = 9; $t < 11; $t++) {
            for ($d = 0, $c = 0; $c < $t; $c++) {
                $d += (int) $cpf[$c] * (($t + 1) - $c);
            }
            $d = ((10 * $d) % 11) % 10;
            if ((int) $cpf[$c] !== $d) {
                return false;
            }
        }

        return true;
    }
}
