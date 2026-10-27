<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Define a rota 'login' para que qualquer middleware que chame route('login') retorne JSON 401 limpo
Route::get('/login', function () {
    return response()->json([
        'message' => 'Unauthenticated.',
    ], 401);
})->name('login');
