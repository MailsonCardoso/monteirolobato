const axios = require('axios');
const readline = require('readline');

const BASE_URL = process.env.EDU_API_URL || 'https://api2.platformx.com.br/api';
const NOME_ALVO = 'isabelly da rocha souto';
const MES_REF = process.env.EDU_MES_REF || '09/2026';

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

function paraISO(data) {
  const m = (data || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) throw new Error(`Data invalida: "${data}" (use DD/MM/AAAA)`);
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  return `${m[3]}-${mm}-${dd}`;
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
      return n.includes('isabelly') || n.includes('rocha') || n.includes('souto');
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
  console.log(`Aluna: ${alvo.nome} (id=${alunoId})`);

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
  const alvoMes = doAluno.find(
    (m) => normalizar(m.mes_referencia ?? m.mesReferencia) === normalizar(MES_REF),
  );

  if (!alvoMes) {
    console.error(`Mensalidade ${MES_REF} NAO ENCONTRADA para ${alvo.nome}.`);
    console.log('Mensalidades da aluna no sistema:');
    for (const m of doAluno) {
      console.log(
        `  - ${m.mes_referencia ?? m.mesReferencia} (${m.status}) valor=${m.valor} forma=${m.forma_pagamento ?? '-'}`,
      );
    }
    process.exit(1);
  }

  const idMes = alvoMes.id ?? alvoMes.mensalidade_id;
  console.log('\nMensalidade encontrada:');
  console.log(`  Referencia: ${alvoMes.mes_referencia ?? alvoMes.mesReferencia}`);
  console.log(`  Status atual: ${alvoMes.status}`);
  console.log(`  Valor: R$ ${Number(alvoMes.valor ?? 0).toFixed(2)}`);
  console.log(`  Vencimento: ${alvoMes.data_vencimento ?? alvoMes.dataVencimento ?? '-'}`);
  console.log(`  Forma: ${alvoMes.forma_pagamento ?? '-'} | Origem: ${alvoMes.origem ?? '-'}`);
  console.log(`  Data pagamento atual: ${alvoMes.data_pagamento ?? alvoMes.dataPagamento ?? '-'}`);

  if (String(alvoMes.status || '').toLowerCase() === 'pago') {
    console.log('\nAVISO: esta mensalidade ja esta marcada como paga. Nada sera alterado.');
    process.exit(0);
  }

  const dataStr = process.env.EDU_DATA_PAGAMENTO || (await perguntar('\nData real do pagamento (DD/MM/AAAA): '));
  let dataIso;
  try {
    dataIso = paraISO(dataStr);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  console.log('\nConfirma marcar esta mensalidade como PAGA?');
  console.log(`  Origem: mercadopago | Forma: pix | Data: ${dataStr}`);
  const ok = (await perguntar('  (s/N): ')).toLowerCase();
  if (ok !== 's' && ok !== 'sim') {
    console.log('Cancelado pelo usuario.');
    process.exit(0);
  }

  await api
    .post(`/mensalidades/${idMes}/pagar`, {
      forma_pagamento: 'pix',
      origem: 'mercadopago',
      data_pagamento: dataIso,
    })
    .catch((e) => {
      console.error(`ERRO ao marcar a mensalidade ${idMes} como paga:`);
      console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
      process.exit(1);
    });
  console.log(`\nMensalidade ${MES_REF} marcada como paga (origem mercadopago, data ${dataStr}).`);

  const sync = await api
    .post('/mensalidades/sincronizar-fluxo-caixa')
    .then((r) => r.data)
    .catch((e) => {
      console.error('ERRO ao sincronizar fluxo de caixa:');
      console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
      process.exit(1);
    });
  console.log(
    `Fluxo de Caixa: ${sync.sincronizadas ?? 0} entrada(s) criada(s) · ${sync.ignoradas ?? 0} ignorada(s).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});