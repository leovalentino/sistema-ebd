const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// --- CONFIGURAÇÕES DO FIREBASE ---
const serviceAccount = require('./ebd-803-firebase-key.json'); 

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
    console.log("Buscando alunos da turma:", turmaId); // Adicionei esse log para te ajudar

    const snapshot = await db.collection('alunos')
      .where('turma_id', '==', turmaId)
      .get();

    const listaAlunos = [];
    snapshot.forEach(doc => {
      listaAlunos.push({ id: doc.id, ...doc.data() });
    });

    res.json(listaAlunos);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Rota 5: Salvar Chamada (COMPLETA)
app.post('/chamada', async (req, res) => {
  try {
    // 1. Recebe os dados que vieram do site
    const { turma_id, oferta, alunos, data_aula, visitantes } = req.body;

    // 2. Calcula os totais para facilitar relatórios futuros
    const total_presentes = alunos.filter(a => a.presente).length;
    const total_biblias = alunos.filter(a => a.trouxe_biblia).length;
    const total_revistas = alunos.filter(a => a.trouxe_revista).length;

    const dadosVisitantes = visitantes || { quantidade: 0, biblias: 0, revistas: 0 };

    let timestamp;
    if (data_aula) {
        // Se veio uma data (YYYY-MM-DD), cria o timestamp forçando meio-dia
        // (Isso evita bugs de fuso horário que jogam pro dia anterior)
        timestamp = admin.firestore.Timestamp.fromDate(new Date(data_aula + "T12:00:00"));
    } else {
        // Se não veio, usa o momento atual
        timestamp = admin.firestore.Timestamp.now();
    }

    // 3. Monta o objeto final para o banco
    const relatorio = {
      turma_id: turma_id,
      data_aula: timestamp,
      oferta_total: parseFloat(oferta) || 0,
      resumo: {
        presentes: total_presentes,
        biblias: total_biblias,
        revistas: total_revistas,
        visitantes: dadosVisitantes
      },
      detalhes_alunos: alunos // A lista completa com os checkboxes
    };

    // 4. Salva na coleção 'relatorios_aula'
    await db.collection('relatorios_aula').add(relatorio);

    // 5. Responde para o site que deu certo
    res.json({ sucesso: true, mensagem: "Dados gravados no Firestore!" });

  } catch (erro) {
    console.error("Erro ao salvar:", erro);
    res.status(500).json({ erro: "Erro interno ao salvar chamada." });
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

// --- O LISTEN FICA NO FINAL DE TUDO ---
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`Servidor rodando na porta ${PORTA}`);
});