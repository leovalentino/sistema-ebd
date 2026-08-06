const API_URL = '';
let firebaseAuth = null;
let usuarioAtual = null;
let authInicializada = null;
let modulosFirebase = null;

function carregarFirebase() {
    if (!modulosFirebase) {
        modulosFirebase = Promise.all([
            import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js')
        ]).then(([app, auth]) => ({ app, auth }));
    }
    return modulosFirebase;
}

async function inicializarAutenticacao() {
    if (authInicializada) return authInicializada;
    authInicializada = (async () => {
        const [{ app, auth }, resposta] = await Promise.all([
            carregarFirebase(),
            fetch(`${API_URL}/api/firebase-config`)
        ]);
        if (!resposta.ok) throw new Error('Não foi possível carregar a configuração do Firebase.');
        const config = await resposta.json();
        if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
            throw new Error('Firebase Client não configurado no servidor.');
        }
        firebaseAuth = auth.getAuth(app.initializeApp(config));
        await new Promise(resolve => auth.onAuthStateChanged(firebaseAuth, resolve));
        return firebaseAuth.currentUser;
    })();
    return authInicializada;
}

async function obterUsuarioAtual() {
    await inicializarAutenticacao();
    return firebaseAuth.currentUser;
}

async function obterToken(forcarRenovacao = false) {
    const usuario = await obterUsuarioAtual();
    if (!usuario) throw new Error('AUTH_REQUIRED');
    return usuario.getIdToken(forcarRenovacao);
}

function paginaAtual() {
    return `${location.pathname}${location.search}`;
}

function irParaLogin() {
    if (location.pathname.endsWith('/login.html')) return;
    location.replace(`login.html?retorno=${encodeURIComponent(paginaAtual())}`);
}

async function encerrarSessao(redirecionar = true) {
    await inicializarAutenticacao();
    await firebaseAuth.signOut();
    usuarioAtual = null;
    if (redirecionar) location.replace('login.html');
}

async function apiFetch(url, options = {}, tentativaRenovada = false) {
    let token;
    try {
        token = await obterToken(tentativaRenovada);
    } catch (erro) {
        irParaLogin();
        throw erro;
    }
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    const resposta = await fetch(url, { ...options, headers });

    if (resposta.status === 401 && !tentativaRenovada) {
        return apiFetch(url, options, true);
    }
    if (resposta.status === 401) {
        await encerrarSessao();
        throw new Error('Sua sessão expirou. Entre novamente.');
    }
    if (resposta.status === 403) {
        const erro = new Error('Sua conta não está autorizada.');
        erro.status = 403;
        throw erro;
    }
    return resposta;
}

async function carregarPerfil() {
    const resposta = await apiFetch(`${API_URL}/api/me`);
    if (!resposta.ok) throw new Error('Não foi possível carregar seu perfil.');
    usuarioAtual = await resposta.json();
    document.dispatchEvent(new CustomEvent('auth-ready', { detail: usuarioAtual }));
    atualizarCabecalhoUsuario();
    return usuarioAtual;
}

async function verificarAcesso(roles = ['admin']) {
    document.documentElement.classList.add('auth-pendente');
    try {
        if (!await obterUsuarioAtual()) return irParaLogin();
        const perfil = usuarioAtual || await carregarPerfil();
        if (!roles.includes(perfil.role)) {
            alert('Você não tem permissão para acessar esta página.');
            location.replace(perfil.role === 'professor' ? 'index.html' : 'dashboard.html');
            return null;
        }
        return perfil;
    } catch (erro) {
        if (erro.status === 403) {
            alert('Sua conta não está autorizada.');
            await encerrarSessao(false);
            location.replace('login.html?erro=nao-autorizada');
        } else {
            console.error('Falha ao verificar acesso:', erro.message);
            irParaLogin();
        }
        return null;
    } finally {
        document.documentElement.classList.remove('auth-pendente');
    }
}

function verificarAcessoUsr() {
    return verificarAcesso(['admin', 'professor']);
}

function usuarioTemRole(role) {
    return usuarioAtual?.role === role;
}

async function entrarComGoogle() {
    const { auth } = await carregarFirebase();
    await inicializarAutenticacao();
    const provider = new auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return auth.signInWithPopup(firebaseAuth, provider);
}

function atualizarCabecalhoUsuario() {
    if (!usuarioAtual || document.getElementById('app-user-area')) return;
    if (usuarioAtual.role !== 'admin') {
        document.querySelectorAll('a[href="dashboard.html"],a[href="cadastro.html"],a[href="financeiro.html"],a[href="frequencia.html"],a[href="relatorio_medias.html"]')
            .forEach(link => link.closest('li')?.remove() || link.remove());
    }
    const nav = document.querySelector('.app-nav-links');
    const item = document.createElement('li');
    item.id = 'app-user-area';
    item.innerHTML = `<small title="${usuarioAtual.email}">${usuarioAtual.nome} · ${usuarioAtual.role}</small> <button type="button" class="outline" style="width:auto;margin:0" onclick="encerrarSessao()">Sair</button>`;
    if (nav) {
        nav.appendChild(item);
    } else {
        item.style.cssText = 'position:fixed;right:1rem;bottom:1rem;z-index:9999;background:#fff;padding:.5rem;border-radius:.5rem;box-shadow:0 2px 10px #0003;list-style:none';
        document.body.appendChild(item);
    }
}

function injetarEstilosComuns() {
    const style = document.createElement('style');
    style.textContent = `.auth-pendente body{visibility:hidden} #app-user-area{display:flex;align-items:center;gap:.5rem}`;
    document.head.appendChild(style);
}

function fecharTodosMenusMobile() {
    document.querySelectorAll('.app-nav.aberto').forEach(nav => {
        nav.classList.remove('aberto');
        const botao = nav.querySelector('.app-nav-toggle');
        if (botao) botao.setAttribute('aria-expanded', 'false');
    });
}

function toggleMobileMenu(botao) {
    const nav = botao.closest('.app-nav');
    if (!nav) return;
    const abrir = !nav.classList.contains('aberto');
    fecharTodosMenusMobile();
    if (abrir) {
        nav.classList.add('aberto');
        botao.setAttribute('aria-expanded', 'true');
    }
}

injetarEstilosComuns();
