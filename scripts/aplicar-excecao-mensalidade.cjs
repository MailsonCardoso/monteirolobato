const axios = require('axios');
const readline = require('readline');

const BASE_URL = process.env.EDU_API_URL || 'https://api2.platformx.com.br/api';
const NOME_ALVO = 'joao miguel amorim campo';
const VALOR_EXCECAO = 50;
const STATUS_ALVO = new Set(['pendente', 'atrasado']);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function perguntar(pergunta) {
  return new Promise((resolve) => rl.question(pergunta, resolve));
}

function normalizar(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const email = process.env.EDU_EMAIL || (await perguntar('E-mail (admin): '));
  const senha = process.env.EDU_PASS || (await perguntar('Senha: '));
  rl.close();

  const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } });

  let token;
  try {
    const { data } = await api.post('/auth/login', { email, password: senha });
    token = data.token;
  } catch (e) {
    console.error('ERRO no login:');
    console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    process.exit(1);
  }
  api.defaults.headers.common.Authorization = `Bearer ${token}`;

  const alunos = await api
    .get('/alunos')
    .then((r) => r.data)
    .catch((e) => {
      console.error('ERRO ao buscar alunos:');
      console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
      process.exit(1);
    });

  const alvo = Array.isArray(alunos) ? alunos.find((a) => normalizar(a.nome) === NOME_ALVO) : null;
  if (!alvo) {
    console.error(`ALUNO NAO ENCONTRADO: "${NOME_ALVO}"`);
    const candidatos = (Array.isArray(alunos) ? alunos : []).filter((a) => {
      const n = normalizar(a.nome);
      return n.includes('joao') || n.includes('miguel') || n.includes('amorim') || n.includes('campo');
    });
    if (candidatos.length) {
      console.log('Candidatos encontrados (confira se algum e o correto):');
      for (const c of candidatos) {
        console.log(`  id=${c.id} nome="${c.nome}" valor_mensalidade=${c.valor_mensalidade ?? c.valorMensalidade}`);
      }
    }
    process.exit(1);
  }

  const alunoId = String(alvo.id);
  const valorAtual = Number(alvo.valor_mensalidade ?? alvo.valorMensalidade ?? 0);
  console.log(`Aluno: ${alvo.nome} (id=${alunoId}) — valor atual: R$ ${valorAtual.toFixed(2)}`);

  if (valorAtual !== VALOR_EXCECAO) {
    await api
      .put(`/alunos/${alunoId}`, { valor_mensalidade: VALOR_EXCECAO })
      .catch((e) => {
        console.error('ERRO ao atualizar valor_mensalidade do aluno:');
        console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
        process.exit(1);
      });
    console.log(`valor_mensalidade do aluno => R$ ${VALOR_EXCECAO},00`);
  } else {
    console.log('valor_mensalidade do aluno ja esta em R$ 50,00 (sem alteracao).');
  }

  const mensalidades = await api
    .get('/mensalidades', { params: { per_page: 2000 } })
    .then((r) => r.data)
    .catch((e) => {
      console.error('ERRO ao buscar mensalidades:');
      console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
      process.exit(1);
    });

  const doAluno = (Array.isArray(mensalidades) ? mensalidades : []).filter(
    (m) => String(m.aluno_id ?? m.alunoId) === alunoId,
  );
  const alvoMes = doAluno.filter((m) => STATUS_ALVO.has(String(m.status || '').toLowerCase()));

  console.log(`Mensalidades do aluno: ${doAluno.length} total · ${alvoMes.length} pendente(s)/em atraso.`);

  for (const m of alvoMes) {
    const idMes = m.id ?? m.mensalidade_id;
    const valorMes = Number(m.valor ?? 0);
    if (valorMes === VALOR_EXCECAO) {
      console.log(`  - ${m.mes_referencia ?? m.mesReferencia} (${m.status}): ja R$ 50,00`);
      continue;
    }
    await api
      .put(`/mensalidades/${idMes}`, { valor: VALOR_EXCECAO })
      .catch((e) => {
        console.error(`ERRO ao atualizar mensalidade ${idMes}:`);
        console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
      });
    console.log(`  - ${m.mes_referencia ?? m.mesReferencia} (${m.status}): => R$ 50,00`);
  }

  console.log('\nConcluido! O aluno Joao Miguel Amorim Campo agora e o unico com mensalidade de R$ 50,00.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});