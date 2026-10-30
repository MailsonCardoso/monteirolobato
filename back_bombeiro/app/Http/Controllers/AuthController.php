<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string',
            'password' => 'required',
        ]);

        $input = trim($request->email);
        $email = strtolower($input);
        $cpfLimpo = preg_replace('/\D/', '', $input);

        $user = User::where(function ($q) use ($email, $cpfLimpo) {
            $q->whereRaw('LOWER(email) = ?', [$email]);
            if ($email === 'admin') {
                $q->orWhere('email', 'admin@escola.com');
            }
            if (strlen($cpfLimpo) >= 11) {
                $q->orWhere('cpf', $cpfLimpo);
            }
        })->first();

        // Se for o admin e não existir ainda no banco, cria automaticamente
        if (!$user && ($email === 'admin@escola.com' || $email === 'admin') && $request->password === 'senha123') {
            $user = User::create([
                'name' => 'Administrador',
                'email' => 'admin@escola.com',
                'password' => 'senha123',
                'role' => 'admin',
                'must_change_password' => false,
            ]);
        }

        $passwordValid = false;
        if ($user) {
            $passwordValid = Hash::check($request->password, $user->password);
            if (!$passwordValid && ($user->password === $request->password || password_verify($request->password, $user->password))) {
                $user->password = $request->password;
                $user->save();
                $passwordValid = true;
            }
        }

        if (!$user || !$passwordValid) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas.'],
            ]);
        }

        try {
            $token = $user->createToken('auth')->plainTextToken;
        } catch (\Throwable $e) {
            if (!\Illuminate\Support\Facades\Schema::hasTable('personal_access_tokens')) {
                \Illuminate\Support\Facades\Schema::create('personal_access_tokens', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->id();
                    $table->morphs('tokenable');
                    $table->string('name');
                    $table->string('token', 64)->unique();
                    $table->text('abilities')->nullable();
                    $table->timestamp('last_used_at')->nullable();
                    $table->timestamp('expires_at')->nullable();
                    $table->timestamps();
                });
            }
            $token = $user->createToken('auth')->plainTextToken;
        }

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'cpf' => $user->cpf,
                'telefone' => $user->telefone,
                'role' => $user->role ?? 'admin',
                'must_change_password' => (bool) $user->must_change_password,
            ],
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => 'required|string|min:6',
            'password_confirmation' => 'required|same:password',
        ]);

        $user = $request->user();
        $user->update([
            'password' => $validated['password'],
            'must_change_password' => false,
        ]);

        return response()->json([
            'message' => 'Senha alterada com sucesso.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'cpf' => $user->cpf,
                'telefone' => $user->telefone,
                'role' => $user->role,
                'must_change_password' => false,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Deslogado com sucesso.']);
    }
}
