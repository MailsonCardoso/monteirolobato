<?php

use App\Http\Controllers\AlunoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CobrancaController;
use App\Http\Controllers\MensalidadeController;
use App\Models\Mensalidade;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FinancialCategoryController;
use App\Http\Controllers\MercadoPagoWebhookController;
use App\Http\Controllers\AuditoriaController;
use App\Http\Controllers\LogAcessoController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PatrimonioController;
use App\Http\Controllers\RevenueController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

// Rotas públicas
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/alunos/check-cpf/{cpf}', [AlunoController::class, 'checkCpf']);
Route::get('/noticias/publicas', [App\Http\Controllers\NoticiaController::class, 'publicas']);
Route::get('/ouvidoria', [App\Http\Controllers\OuvidoriaController::class, 'index']);
Route::post('/ouvidoria', [App\Http\Controllers\OuvidoriaController::class, 'store']);
Route::get('/ouvidoria/{protocolo}', [App\Http\Controllers\OuvidoriaController::class, 'show']);
Route::get('/transparencia', [App\Http\Controllers\TransparenciaController::class, 'index']);
Route::post('/documentos/chunks', [App\Http\Controllers\DocumentoController::class, 'chunks']);
Route::get('/documentos', [App\Http\Controllers\DocumentoController::class, 'index']);
Route::post('/associado', [App\Http\Controllers\AssociadoController::class, 'store']);
Route::post('/associado/login', [App\Http\Controllers\AssociadoController::class, 'login']);
Route::get('/associado/login', function () {
    return response()->json([
        'success' => false,
        'message' => 'Método não permitido. Use POST para realizar o login.',
    ], 405);
});
Route::post('/associado/logout', [App\Http\Controllers\AssociadoController::class, 'logout']);
Route::get('/associado', [App\Http\Controllers\AssociadoController::class, 'show']);
Route::put('/associado', [App\Http\Controllers\AssociadoController::class, 'update']);
Route::get('/associado/mensalidades', [App\Http\Controllers\AssociadoController::class, 'mensalidades']);

// Webhook Mercado Pago (público)
Route::post('/webhooks/mercadopago', MercadoPagoWebhookController::class);

// Cobrança Mercado Pago (usando token do associado)
Route::post('/mensalidades/{mensalidade}/gerar-cobranca', [CobrancaController::class, 'gerar']);
Route::get('/mensalidades/{mensalidade}/status-pagamento', [CobrancaController::class, 'status']);

// Fallback: responde JSON limpo quando um GET cai na rota /pagar (redirecionamentos)
Route::get('/mensalidades/{mensalidade}/pagar', function (Mensalidade $mensalidade) {
    return response()->json([
        'success' => true,
        'message' => 'Pagamento deve ser confirmado via POST.',
        'data' => [
            'mensalidade_id' => $mensalidade->id,
            'status' => $mensalidade->status,
            'forma_pagamento' => $mensalidade->forma_pagamento,
            'origem' => $mensalidade->origem,
        ],
    ]);
});

// Rotas protegidas
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/auth/password', [AuthController::class, 'changePassword']);

    Route::apiResource('funcionarios', App\Http\Controllers\FuncionarioController::class);

    Route::get('/dashboard/financeiro', [App\Http\Controllers\DashboardController::class, 'financeiro']);
    Route::get('/dashboard/mensalidades', [App\Http\Controllers\DashboardController::class, 'mensalidades']);
    Route::apiResource('alunos', AlunoController::class);
    Route::post('/alunos/{aluno}/foto', [AlunoController::class, 'uploadFoto']);
    Route::get('/alunos/{aluno}/extrato', [AlunoController::class, 'extrato']);
    Route::post('/mensalidades/gerar-proximo-mes', [MensalidadeController::class, 'gerarProximoMes']);
    Route::post('/mensalidades/sincronizar-fluxo-caixa', [MensalidadeController::class, 'sincronizarFluxoCaixa']);
    Route::post('/mensalidades/{mensalidade}/pagar', [MensalidadeController::class, 'pagar']);
    Route::post('/mensalidades/verificar-vencidas', [MensalidadeController::class, 'verificarVencidas']);
    Route::apiResource('mensalidades', MensalidadeController::class);
    Route::apiResource('financial-categories', FinancialCategoryController::class)->except(['show']);
    Route::apiResource('revenues', RevenueController::class);
    Route::apiResource('expenses', ExpenseController::class);
    Route::apiResource('patrimonios', PatrimonioController::class);
    Route::get('transactions', [TransactionController::class, 'index']);
    Route::post('transactions', [TransactionController::class, 'store']);
    Route::delete('transactions/{transaction}', [TransactionController::class, 'destroy']);
    Route::post('transactions/close-month', [TransactionController::class, 'closeMonth']);

    Route::apiResource('noticias', App\Http\Controllers\NoticiaController::class);
    Route::apiResource('categorias', App\Http\Controllers\CategoriaController::class)->except(['show']);
    Route::put('/ouvidoria/{ouvidoria}', [App\Http\Controllers\OuvidoriaController::class, 'update']);
    Route::delete('/ouvidoria/{ouvidoria}', [App\Http\Controllers\OuvidoriaController::class, 'destroy']);
    Route::post('/documentos', [App\Http\Controllers\DocumentoController::class, 'store']);
    Route::post('/documentos/{documento}', [App\Http\Controllers\DocumentoController::class, 'update']);
    Route::delete('/documentos/{documento}', [App\Http\Controllers\DocumentoController::class, 'destroy']);
    Route::get('/associados', [App\Http\Controllers\AssociadoController::class, 'listAll']);
    Route::delete('/associados/{id}', [App\Http\Controllers\AssociadoController::class, 'destroy']);
    Route::get('/admin/auditoria/pagamentos', [AuditoriaController::class, 'pagamentos']);
    Route::post('/admin/auditoria/pagamentos', [AuditoriaController::class, 'store']);
    Route::delete('/admin/auditoria/pagamentos/{pagamentoTransacao}', [AuditoriaController::class, 'destroy']);
    Route::get('/admin/logs-acesso', [LogAcessoController::class, 'index']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/read', [NotificationController::class, 'markAsRead']);
});
