// 1. Carrega as variáveis do arquivo ..env
require('dotenv').config();

const express = require('express');
const admin = require("firebase-admin");
const cors = require('cors');

// 2. Lê a variável de ambiente (Se não tiver nada, assume 'development')
const AMBIENTE = process.env.NODE_ENV || 'development';

// Verifica se é produção
const isProduction = AMBIENTE === 'production';

let serviceAccount;

if (isProduction) {
  console.log("🔴 AMBIENTE: PRODUÇÃO (DADOS REAIS)");
  // Em produção (no servidor), o arquivo deve existir lá
  try {
    serviceAccount = require("./ebd-803-firebase-key.json");
  } catch (e) {
    console.error("ERRO CRÍTICO: Arquivo de credenciais de produção não encontrado!");
    process.exit(1);
  }
} else {
  console.log("🟢 AMBIENTE: DESENVOLVIMENTO (TESTE)");
  serviceAccount = require("./ebd-803-firebase-key-test.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore(); // Conecta no banco de dados

// --- CONFIGURAÇÕES DO SERVIDOR (EXPRESS) ---
const app = express();
app.use(cors());          // Libera acesso para navegadores
app.use(express.json());  // Permite receber dados em JSON

// Diz para o servidor entregar os arquivos da pasta 'public' (index.html, etc)
app.use(express.static('public')); 

// Rota 1: Teste
app.get('/', (req, res) => res.send('API Online'));

app.post('/auth/login', (req, res) => {
  const { senha } = req.body; // O frontend envia a senha digitada

  // O Backend compara com a variável secreta do .env
  const senhaCorreta = process.env.SENHA_ADM;

  if (senha === senhaCorreta) {
    res.json({ sucesso: true });
  } else {
    res.status(401).json({ sucesso: false, mensagem: "Senha incorreta" });
  }
});

app.post('/auth/login-usr', (req, res) => {
  const { senha } = req.body; // O frontend envia a senha digitada

  // O Backend compara com a variável secreta do .env
  const senhaCorreta = process.env.SENHA_USR;

  if (senha === senhaCorreta) {
    res.json({ sucesso: true });
  } else {
    res.status(401).json({ sucesso: false, mensagem: "Senha incorreta" });
  }
});

// Rota 2: Listar Turmas
app.get('/turmas', async (req, res) => {
  const snapshot = await db.collection('turmas').get();
  const lista = [];
  snapshot.forEach(doc => lista.push({ id: doc.id, ...doc.data() }));
  res.json(lista);
});

// Rota 3: Cadastrar Aluno
app.post('/alunos', async (req, res) => {
  try {
    // Recebe a data junto com os outros dados
    const { nome, turma_id, ativo, data_nascimento } = req.body;
    
    await db.collection('alunos').add({
      nome: nome,
      turma_id: turma_id,
      ativo: ativo,
      data_nascimento: data_nascimento || null, // Salva null se não preencher
      criado_em: new Date().toISOString()
    });
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Rota 4: BUSCAR ALUNOS DA TURMA
app.get('/turmas/:turmaId/alunos', async (req, res) => {
  try {
    const turmaId = req.params.turmaId;

    const snapshot = await db.collection('alunos')
      .where('turma_id', '==', turmaId)
      .get();

    const listaAlunos = [];
    snapshot.forEach(doc => {
      listaAlunos.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(listaAlunos);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Rota 5: PAINEL FINANCEIRO (Agrupado por TRIMESTRE)
app.get('/financeiro/resumo', async (req, res) => {
  try {
    const snapshot = await db.collection('relatorios_aula')
        .where('oferta_total', '>', 0)
        .orderBy('oferta_total', 'desc')
        .get();

    const dadosPorTrimestre = {};
    let totalGeral = 0;

    // Nomes bonitos para exibir
    const nomesTrimestres = {
      1: "Jan-Mar",
      2: "Abr-Jun",
      3: "Jul-Set",
      4: "Out-Dez"
    };

    snapshot.forEach(doc => {
      const data = doc.data();
      const valor = data.oferta_total;

      const dataJS = data.data_aula.toDate();
      const mes = dataJS.getMonth(); // 0 a 11
      const ano = dataJS.getFullYear();

      // CÁLCULO MÁGICO DO TRIMESTRE
      const numTrimestre = Math.floor(mes / 3) + 1;

      // Cria a chave ex: "Jan-Mar/2024"
      const chave = `${nomesTrimestres[numTrimestre]}/${ano}`;

      if (!dadosPorTrimestre[chave]) {
        dadosPorTrimestre[chave] = { entradas: 0, saidas: 0 };
      }

      dadosPorTrimestre[chave].entradas += valor;
      totalGeral += valor;
    });

    // Transforma em array inicial
    const relatorioFinal = Object.keys(dadosPorTrimestre).map(chave => ({
      periodo: chave,
      entradas: dadosPorTrimestre[chave].entradas,
      saidas: dadosPorTrimestre[chave].saidas,
      total: dadosPorTrimestre[chave].entradas - dadosPorTrimestre[chave].saidas
    }));

    // --- LANÇAMENTOS AVULSOS (Novos) ---
    const snapshotLancamentos = await db.collection('lancamentos_financeiros')
        .orderBy('data', 'desc')
        .get();

    const listaLancamentos = [];
    snapshotLancamentos.forEach(doc => {
      const data = doc.data();
      const valor = data.valor || 0;
      const tipo = data.tipo; // 'entrada' ou 'saida'
      const dataJS = data.data.toDate();
      
      const mes = dataJS.getMonth();
      const ano = dataJS.getFullYear();
      const numTrimestre = Math.floor(mes / 3) + 1;
      const chave = `${nomesTrimestres[numTrimestre]}/${ano}`;

      // Adiciona ao total geral
      totalGeral += (tipo === 'entrada' ? valor : -valor);

      // Adiciona ao histórico por trimestre
      let itemExistente = relatorioFinal.find(r => r.periodo === chave);
      if (!itemExistente) {
        itemExistente = { periodo: chave, entradas: 0, saidas: 0, total: 0 };
        relatorioFinal.push(itemExistente);
      }

      if (tipo === 'entrada') {
        itemExistente.entradas += valor;
      } else {
        itemExistente.saidas += valor;
      }
      itemExistente.total = itemExistente.entradas - itemExistente.saidas;

      listaLancamentos.push({ id: doc.id, ...data, data_formatada: dataJS.toLocaleDateString('pt-BR') });
    });

    res.json({
      total_acumulado: totalGeral,
      historico: relatorioFinal,
      lancamentos: listaLancamentos
    });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: erro.message });
  }
});

// --- NOVAS ROTAS FINANCEIRAS ---
app.post('/financeiro/lancamentos', async (req, res) => {
  try {
    const { valor, tipo, descricao, data } = req.body;
    
    // Valor deve ser número positivo (convertido de string no frontend se necessário)
    const valorNum = parseFloat(valor);
    if (isNaN(valorNum)) return res.status(400).json({ erro: "Valor inválido" });

    const dataObj = data ? new Date(data + "T12:00:00") : new Date();

    const novoLancamento = {
      valor: valorNum,
      tipo, // 'entrada' ou 'saida'
      descricao,
      data: admin.firestore.Timestamp.fromDate(dataObj),
      criado_em: admin.firestore.Timestamp.now()
    };

    const docRef = await db.collection('lancamentos_financeiros').add(novoLancamento);
    res.json({ sucesso: true, id: docRef.id });

  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.delete('/financeiro/lancamentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('lancamentos_financeiros').doc(id).delete();
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Rota: Criar Nova Turma
app.post('/turmas', async (req, res) => {
  try {
    const doc = await db.collection('turmas').add(req.body);
    res.json({ id: doc.id, sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Rota 6: Listar Relatórios (Para o Dashboard)
app.get('/relatorios', async (req, res) => {
  try {
    // Busca ordenado por data (do mais recente para o antigo)
    const snapshot = await db.collection('relatorios_aula')
      .orderBy('data_aula', 'desc')
      .get();

    const relatorios = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Converte o Timestamp do Firebase para data legível
      const dataFormatada = data.data_aula.toDate().toLocaleDateString('pt-BR');
      
      relatorios.push({
        id: doc.id,
        ...data,
        data_formatada: dataFormatada
      });
    });

    res.json(relatorios);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Rota: Editar Aluno
app.put('/alunos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dadosAtualizados = req.body; // Pega tudo que vier (nome, data, etc)
    
    await db.collection('alunos').doc(id).update(dadosAtualizados);
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Rota: Excluir Relatório (Para corrigir chamadas erradas)
app.delete('/relatorios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('relatorios_aula').doc(id).delete();
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// --- NOVO: Rota para verificar se já tem chamada no dia ---
app.get('/relatorios/medias', async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    let query = db.collection('relatorios_aula');

    if (data_inicio && data_fim) {
      const start = admin.firestore.Timestamp.fromDate(new Date(data_inicio + "T00:00:00"));
      const end = admin.firestore.Timestamp.fromDate(new Date(data_fim + "T23:59:59"));
      query = query.where('data_aula', '>=', start).where('data_aula', '<=', end);
    }

    const snapshotRelatorios = await query.get();
    const snapshotTurmas = await db.collection('turmas').get();

    const mapaTurmas = {};
    snapshotTurmas.forEach(doc => {
      mapaTurmas[doc.id] = doc.data().nome;
    });

    const totaisPorTurma = {}; // { turmaId: { somaPres: 0, somaMatr: 0, somaAus: 0, somaVis: 0, somaTotal: 0, somaOferta: 0, somaBib: 0, somaRev: 0, qtd: 0 } }
    const datasUnicas = new Set();

    snapshotRelatorios.forEach(doc => {
      const data = doc.data();
      const turmaId = data.turma_id;
      
      // Adiciona a data ao Set para contar domingos únicos
      if (data.data_aula) {
        datasUnicas.add(data.data_aula.toDate().toLocaleDateString('pt-BR'));
      }
      
      const matriculados = data.detalhes_alunos ? data.detalhes_alunos.length : 0;
      const presentes = data.resumo ? data.resumo.presentes : 0;
      const ausentes = matriculados - presentes;
      const visitantes = data.resumo && data.resumo.visitantes ? (data.resumo.visitantes.quantidade || 0) : 0;
      const totalPessoas = presentes + visitantes;
      const oferta = data.oferta_total || 0;
      
      const bibMembros = data.resumo ? (data.resumo.biblias || 0) : 0;
      const revMembros = data.resumo ? (data.resumo.revistas || 0) : 0;
      const bibVis = data.resumo && data.resumo.visitantes ? (data.resumo.visitantes.biblias || 0) : 0;
      const revVis = data.resumo && data.resumo.visitantes ? (data.resumo.visitantes.revistas || 0) : 0;
      
      const totalBib = bibMembros + bibVis;
      const totalRev = revMembros + revVis;

      if (!totaisPorTurma[turmaId]) {
        totaisPorTurma[turmaId] = { 
          somaPres: 0, somaMatr: 0, somaAus: 0, somaVis: 0, 
          somaTotal: 0, somaOferta: 0, somaBib: 0, somaRev: 0, qtd: 0 
        };
      }

      totaisPorTurma[turmaId].somaPres += presentes;
      totaisPorTurma[turmaId].somaMatr += matriculados;
      totaisPorTurma[turmaId].somaAus += ausentes;
      totaisPorTurma[turmaId].somaVis += visitantes;
      totaisPorTurma[turmaId].somaTotal += totalPessoas;
      totaisPorTurma[turmaId].somaOferta += oferta;
      totaisPorTurma[turmaId].somaBib += totalBib;
      totaisPorTurma[turmaId].somaRev += totalRev;
      totaisPorTurma[turmaId].qtd += 1;
    });

    const medias = Object.keys(totaisPorTurma).map(turmaId => {
      const info = totaisPorTurma[turmaId];
      return {
        turma_id: turmaId,
        nome_turma: mapaTurmas[turmaId] || "Turma Desconhecida",
        total_aulas: info.qtd,
        media_presentes: info.somaPres / info.qtd,
        media_matriculados: info.somaMatr / info.qtd,
        media_ausentes: info.somaAus / info.qtd,
        media_visitantes: info.somaVis / info.qtd,
        media_total: info.somaTotal / info.qtd,
        media_oferta: info.somaOferta / info.qtd,
        media_biblias: info.somaBib / info.qtd,
        media_revistas: info.somaRev / info.qtd,
        percentual_frequencia: info.somaMatr > 0 ? (info.somaPres / info.somaMatr) * 100 : 0
      };
    });

    // Calcula as médias gerais
    let somaGeralPres = 0, somaGeralMatr = 0, somaGeralAus = 0, somaGeralVis = 0;
    let somaGeralTotal = 0, somaGeralOferta = 0, somaGeralBib = 0, somaGeralRev = 0;
    let qtdGeral = 0;

    Object.values(totaisPorTurma).forEach(info => {
      somaGeralPres += info.somaPres;
      somaGeralMatr += info.somaMatr;
      somaGeralAus += info.somaAus;
      somaGeralVis += info.somaVis;
      somaGeralTotal += info.somaTotal;
      somaGeralOferta += info.somaOferta;
      somaGeralBib += info.somaBib;
      somaGeralRev += info.somaRev;
      qtdGeral += info.qtd;
    });

    // O divisor para a média geral agora é o número de domingos (datas únicas)
    const divisorGeral = datasUnicas.size || 1;

    res.json({
      medias,
      geral: {
        media_presentes: somaGeralPres / divisorGeral,
        media_matriculados: somaGeralMatr / divisorGeral,
        media_ausentes: somaGeralAus / divisorGeral,
        media_visitantes: somaGeralVis / divisorGeral,
        media_total: somaGeralTotal / divisorGeral,
        media_oferta: somaGeralOferta / divisorGeral,
        media_biblias: somaGeralBib / divisorGeral,
        media_revistas: somaGeralRev / divisorGeral,
        percentual_frequencia: somaGeralMatr > 0 ? (somaGeralPres / somaGeralMatr) * 100 : 0
      },
      total_geral_aulas: qtdGeral,
      total_domingos: datasUnicas.size
    });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: erro.message });
  }
});

// --- NOVO: Rota para verificar se já tem chamada no dia ---
app.get('/chamada/verificar', async (req, res) => {
  try {
    const { turma_id, data } = req.query;

    // Recria a lógica do Timestamp (Meio-dia) para bater com o banco
    const timestamp = admin.firestore.Timestamp.fromDate(new Date(data + "T12:00:00"));

    const snapshot = await db.collection('relatorios_aula')
        .where('turma_id', '==', turma_id)
        .where('data_aula', '==', timestamp)
        .limit(1)
        .get();

    if (snapshot.empty) {
      return res.json({ encontrada: false });
    }

    // Se achou, devolve os dados para preencher a tela
    const doc = snapshot.docs[0];
    return res.json({ encontrada: true, id: doc.id, ...doc.data() });

  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ATUALIZADO: Rota de Salvar (Com busca por intervalo de data)
app.post('/chamada', async (req, res) => {
  try {
    const { turma_id, oferta, alunos, data_aula, visitantes, professor, observacoes } = req.body;

    // 1. Definição do Intervalo
    // Adicionamos 'T00:00:00' e ajustamos o fuso se necessário, mas para debug vamos simples
    const startData = new Date(data_aula + "T00:00:00");
    const endData = new Date(data_aula + "T23:59:59");

    // Converter para Timestamp do Firebase
    const start = admin.firestore.Timestamp.fromDate(startData);
    const end = admin.firestore.Timestamp.fromDate(endData);

    // 2. Busca
    const snapshot = await db.collection('relatorios_aula')
        .where('turma_id', '==', turma_id)
        .where('data_aula', '>=', start)
        .where('data_aula', '<=', end)
        .limit(1)
        .get();

    // Prepara dados para salvar
    const timestampPadrao = admin.firestore.Timestamp.fromDate(new Date(data_aula + "T12:00:00"));

    const total_presentes = alunos.filter(a => a.presente).length;
    const total_biblias = alunos.filter(a => a.trouxe_biblia).length;
    const total_revistas = alunos.filter(a => a.trouxe_revista).length;

    const dadosRelatorio = {
      turma_id,
      data_aula: timestampPadrao,
      oferta_total: parseFloat(oferta) || 0,
      professor: professor || "",
      observacoes: observacoes || "",
      resumo: {
        presentes: total_presentes,
        biblias: total_biblias,
        revistas: total_revistas,
        visitantes: visitantes || { quantidade: 0, biblias: 0, revistas: 0 }
      },
      detalhes_alunos: alunos
    };

    if (!snapshot.empty) {
      // UPDATE
      const docId = snapshot.docs[0].id;
      await db.collection('relatorios_aula').doc(docId).set(dadosRelatorio, { merge: true });
      res.json({ sucesso: true, mensagem: "Chamada atualizada!" });
    } else {
      // CREATE
      const docRef = await db.collection('relatorios_aula').add(dadosRelatorio);
      res.json({ sucesso: true, mensagem: "Nova chamada salva!" });
    }

  } catch (erro) {
    console.error("ERRO NO CATCH:", erro);
    res.status(500).json({ erro: erro.message });
  }
});

//Salvar informações do dia (Clima, Secretário...)
app.post('/diario', async (req, res) => {
  try {
    const { data, secretario, clima, observacoes } = req.body;

    // Transforma "30/01/2025" em "30-01-2025" para usar como ID único
    const docId = data.replace(/\//g, '-');

    await db.collection('diario_geral').doc(docId).set({
      data,
      secretario,
      clima,
      observacoes,
      ultima_atualizacao: new Date()
    }, { merge: true });

    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// 2. Ler todas as informações
app.get('/diario', async (req, res) => {
  try {
    const snapshot = await db.collection('diario_geral').get();
    const dados = [];
    snapshot.forEach(doc => dados.push(doc.data()));
    res.json(dados);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Rota: Relatório de Frequência por Aluno (Ranking)
app.get('/relatorios/frequencia', async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    if (!data_inicio || !data_fim) {
      return res.status(400).json({ erro: "Parâmetros data_inicio e data_fim são obrigatórios" });
    }

    // Converte para Timestamps do Firebase
    const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(data_inicio + "T00:00:00"));
    const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(data_fim + "T23:59:59"));

    // Busca relatórios no intervalo de datas
    const snapshot = await db.collection('relatorios_aula')
      .where('data_aula', '>=', startTimestamp)
      .where('data_aula', '<=', endTimestamp)
      .orderBy('data_aula', 'asc') // Ordena por data para calcular faltas consecutivas
      .get();

    // Busca turmas para mapear nomes
    const turmasSnapshot = await db.collection('turmas').get();
    const mapaTurmas = {};
    turmasSnapshot.forEach(doc => mapaTurmas[doc.id] = doc.data().nome);

    // Agrega dados por aluno
    const frequenciaPorAluno = {};
    let totalAulas = 0;
    const aulasPorTurma = {}; // Para contar aulas por turma

    snapshot.forEach(doc => {
      const data = doc.data();
      const turmaId = data.turma_id;

      // Conta aulas por turma
      if (!aulasPorTurma[turmaId]) {
        aulasPorTurma[turmaId] = 0;
      }
      aulasPorTurma[turmaId]++;

      // Processa cada aluno
      if (data.detalhes_alunos && Array.isArray(data.detalhes_alunos)) {
        data.detalhes_alunos.forEach(aluno => {
          const chave = aluno.id;

          if (!frequenciaPorAluno[chave]) {
            frequenciaPorAluno[chave] = {
              id: aluno.id,
              nome: aluno.nome,
              turma_id: turmaId,
              turma_nome: mapaTurmas[turmaId] || 'Turma Desconhecida',
              presencas: 0,
              faltas: 0,
              faltas_justificadas: 0,
              total_aulas: 0,
              faltas_consecutivas: 0,
              _faltas_atuais: 0 // Auxiliar para cálculo
            };
          }

          frequenciaPorAluno[chave].total_aulas++;

          if (aluno.presente) {
            frequenciaPorAluno[chave].presencas++;
            frequenciaPorAluno[chave]._faltas_atuais = 0; // Reseta consecutivas se estiver presente
          } else if (aluno.falta_justificada) {
            // Falta justificada: neutra no cálculo de percentual
            frequenciaPorAluno[chave].faltas_justificadas++;
            // Se quiser que falta justificada TAMBÉM quebre a sequência de faltas, descomente:
            // frequenciaPorAluno[chave]._faltas_atuais = 0; 
          } else {
            // Falta normal
            frequenciaPorAluno[chave].faltas++;
            frequenciaPorAluno[chave]._faltas_atuais++;
            
            // Atualiza o recorde de faltas consecutivas se as atuais forem maiores
            if (frequenciaPorAluno[chave]._faltas_atuais > frequenciaPorAluno[chave].faltas_consecutivas) {
              frequenciaPorAluno[chave].faltas_consecutivas = frequenciaPorAluno[chave]._faltas_atuais;
            }
          }
        });
      }
    });

    // Converte para array e calcula percentual
    // O percentual considera apenas aulas sem falta justificada (presencas / (total - justificadas))
    const ranking = Object.values(frequenciaPorAluno)
      .map(aluno => {
        const { _faltas_atuais, ...dadosAluno } = aluno; // Remove campo auxiliar
        const aulasContabilizadas = dadosAluno.total_aulas - dadosAluno.faltas_justificadas;
        return {
          ...dadosAluno,
          percentual: aulasContabilizadas > 0
            ? ((dadosAluno.presencas / aulasContabilizadas) * 100).toFixed(2)
            : "0.00"
        };
      })
      .sort((a, b) => b.presencas - a.presencas); // Ordena por número de presenças (desc)

    res.json({
      periodo: { inicio: data_inicio, fim: data_fim },
      total_relatorios: snapshot.size,
      ranking: ranking
    });

  } catch (erro) {
    console.error("Erro ao gerar relatório de frequência:", erro);
    res.status(500).json({ erro: erro.message });
  }
});

// --- O LISTEN FICA NO FINAL DE TUDO ---
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`Servidor rodando na porta ${PORTA}`);
});