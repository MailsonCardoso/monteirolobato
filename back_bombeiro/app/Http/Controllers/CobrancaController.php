<?php

namespace App\Http\Controllers;

use App\Http\Requests\GerarCobrancaRequest;
use App\Models\Mensalidade;
use App\Services\MercadoPagoService;
use App\Services\PagamentoService;
use Illuminate\Http\JsonResponse;

class CobrancaController extends Controller
{
    public function __construct(
        private readonly PagamentoService $pagamentoService,
        private readonly MercadoPagoService $mercadopago,
    ) {}

    public function gerar(Mensalidade $mensalidade, GerarCobrancaRequest $request): \Symfony\Component\HttpFoundation\Response
    {
        $formaPagamento = $request->input('forma_pagamento', 'pix');

        try {
            // Se já existir transação pendente com qr_code ou payment_url e a mensalidade não estiver paga, reutiliza
            $transacao = $mensalidade->ultimaTransacao;
            if (!$transacao || in_array($transacao->status, ['cancelled', 'rejected'])) {
                $transacao = $this->pagamentoService->gerarCobranca($mensalidade, $formaPagamento);
            }

            $payloadRequest = $transacao->payload_request ?? [];

            $data = [
                'id' => $transacao->id,
                'payment_url' => $transacao->payment_url,
                'external_reference' => $transacao->external_reference,
                'status' => $transacao->status,
                'forma_pagamento' => $formaPagamento,
            ];

            if ($formaPagamento === 'pix') {
                $data['pix_qr_code'] = $payloadRequest['point_of_interaction']['transaction_data']['qr_code'] ?? null;
                $data['pix_qr_code_base64'] = $payloadRequest['point_of_interaction']['transaction_data']['qr_code_base64'] ?? null;
            } else {
                $data['boleto_url'] = $transacao->payment_url;
                $data['data_vencimento'] = now()->addDays(3)->format('Y-m-d');
            }

            // Se for requisição GET direta do navegador e houver URL externa válida do Mercado Pago:
            if ($request->isMethod('GET') && $request->acceptsHtml() && !empty($transacao->payment_url) && filter_var($transacao->payment_url, FILTER_VALIDATE_URL)) {
                return redirect()->away($transacao->payment_url);
            }

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Cobrança gerada com sucesso.',
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro interno ao gerar cobrança: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function status(Mensalidade $mensalidade): JsonResponse
    {
        $transacao = $mensalidade->ultimaTransacao;

        if ($mensalidade->status !== 'pago' && $transacao?->payment_id) {
            try {
                $dadosMP = $this->mercadopago->consultarPagamento($transacao->payment_id);
                $statusMP = $dadosMP['status'] ?? null;

                if ($statusMP === 'approved') {
                    $this->pagamentoService->processarNotificacaoWebhook(
                        paymentId: $transacao->payment_id,
                        payloadWebhook: $dadosMP,
                    );
                    $mensalidade->refresh();
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Status: erro ao consultar MP', [
                    'payment_id' => $transacao->payment_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $transacao = $mensalidade->ultimaTransacao;

        return response()->json([
            'success' => true,
            'data' => [
                'mensalidade_id' => $mensalidade->id,
                'status' => $mensalidade->status,
                'data_pagamento' => $mensalidade->data_pagamento?->format('d/m/Y'),
                'forma_pagamento' => $mensalidade->forma_pagamento,
                'origem' => $mensalidade->origem,
                'transacao' => $transacao ? [
                    'id' => $transacao->id,
                    'payment_id' => $transacao->payment_id,
                    'preference_id' => $transacao->preference_id,
                    'external_reference' => $transacao->external_reference,
                    'status' => $transacao->status,
                    'payment_method' => $transacao->payment_method,
                    'payment_url' => $transacao->payment_url,
                ] : null,
            ],
        ]);
    }
}
