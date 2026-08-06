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
    style.id = 'app-common-styles';
    style.textContent = `
        .auth-pendente body { visibility: hidden; }

        .app-nav,
        .app-nav * { box-sizing: border-box; }

        .app-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            max-width: 100%;
            margin-bottom: 1.5rem;
        }

        .app-nav-bar,
        .app-nav-brand,
        .app-nav-links {
            margin: 0;
            padding: 0;
        }

        .app-nav-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: .75rem;
        }

        .app-nav-brand,
        .app-nav-links {
            list-style: none;
        }

        .app-nav-brand {
            min-width: 0;
        }

        .app-nav-brand strong {
            display: block;
            overflow-wrap: anywhere;
        }

        .app-nav-links {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: .625rem;
            flex-wrap: wrap;
        }

        .app-nav-links li,
        .app-nav-links a[role="button"] { margin: 0; }

        .app-nav-links a[role="button"] { white-space: nowrap; }

        .app-nav-toggle {
            display: none;
            width: auto;
            min-width: 0;
            margin: 0;
            padding: .55rem .8rem;
            white-space: nowrap;
        }

        #app-user-area {
            display: flex;
            align-items: center;
            gap: .5rem;
            min-width: 0;
        }

        .app-nav-backdrop { display: none; }

        @media (max-width: 768px) {
            html, body { max-width: 100%; }
            html { overflow-x: clip; }

            .app-nav {
                display: block;
                width: 100%;
                max-width: 100%;
            }

            .app-nav-bar {
                width: 100%;
                min-height: 44px;
            }

            .app-nav-toggle {
                display: inline-flex;
                flex: 0 0 auto;
                align-items: center;
                justify-content: center;
                gap: .4rem;
            }

            .app-nav-links {
                position: fixed;
                top: 0;
                right: 0;
                bottom: 0;
                z-index: 1201;
                display: flex;
                width: min(85vw, 340px);
                max-width: 100%;
                margin: 0;
                padding: 5rem 1rem 1.25rem;
                flex-direction: column;
                flex-wrap: nowrap;
                align-items: stretch;
                justify-content: flex-start;
                gap: .65rem;
                overflow-x: hidden;
                overflow-y: auto;
                overscroll-behavior: contain;
                background: #11191f;
                box-shadow: -12px 0 30px rgba(0, 0, 0, .28);
                visibility: hidden;
                opacity: 0;
                pointer-events: none;
                transform: translateX(100%);
                transition: transform .22s ease, opacity .22s ease, visibility 0s linear .22s;
            }

            .app-nav-links li,
            .app-nav-links a[role="button"] {
                width: 100%;
                max-width: 100%;
            }

            .app-nav-links a[role="button"] {
                display: block;
                text-align: center;
                white-space: normal;
            }

            .app-nav.is-open .app-nav-links {
                visibility: visible;
                opacity: 1;
                pointer-events: auto;
                transform: translateX(0);
                transition: transform .22s ease, opacity .22s ease;
            }

            .app-nav.is-open .app-nav-bar {
                position: fixed;
                top: 0;
                right: 0;
                z-index: 1202;
                width: min(85vw, 340px);
                max-width: 100%;
                min-height: 4rem;
                padding: .75rem 1rem;
                color: #fff;
                background: #11191f;
            }

            .app-nav.is-open .app-nav-brand strong { color: #fff; }

            .app-nav-backdrop {
                position: fixed;
                inset: 0;
                z-index: 1200;
                display: block;
                margin: 0;
                padding: 0;
                border: 0;
                border-radius: 0;
                background: rgba(0, 0, 0, .55);
                visibility: hidden;
                opacity: 0;
                pointer-events: none;
                transition: opacity .22s ease, visibility 0s linear .22s;
            }

            .app-nav-backdrop.is-visible {
                visibility: visible;
                opacity: 1;
                pointer-events: auto;
                transition: opacity .22s ease;
            }

            body.menu-drawer-open { overflow: hidden; }

            #app-user-area {
                margin-top: auto;
                padding-top: 1rem;
                flex-wrap: wrap;
                color: #fff;
            }
        }
    `;
    document.head.appendChild(style);
}

function fecharTodosMenusMobile() {
    document.querySelectorAll('.app-nav.is-open').forEach(nav => {
        nav.classList.remove('is-open');
        const botao = nav.querySelector('.app-nav-toggle');
        const links = nav.querySelector('.app-nav-links');
        if (botao) {
            botao.setAttribute('aria-expanded', 'false');
            botao.innerHTML = '<span aria-hidden="true">☰</span><span>Menu</span>';
            botao.setAttribute('aria-label', 'Abrir menu de navegação');
        }
        if (links) links.setAttribute('aria-hidden', 'true');
    });
    document.querySelector('.app-nav-backdrop')?.classList.remove('is-visible');
    document.body.classList.remove('menu-drawer-open');
}

function toggleMobileMenu(botao) {
    const nav = botao.closest('.app-nav');
    if (!nav) return;
    const abrir = !nav.classList.contains('is-open');
    fecharTodosMenusMobile();
    if (abrir) {
        nav.classList.add('is-open');
        botao.setAttribute('aria-expanded', 'true');
        botao.setAttribute('aria-label', 'Fechar menu de navegação');
        botao.innerHTML = '<span aria-hidden="true">✕</span><span>Fechar</span>';
        nav.querySelector('.app-nav-links')?.setAttribute('aria-hidden', 'false');
        document.querySelector('.app-nav-backdrop')?.classList.add('is-visible');
        document.body.classList.add('menu-drawer-open');
        botao.focus();
    }
}

function inicializarMenuMobile() {
    const menus = document.querySelectorAll('.app-nav');
    if (!menus.length || document.querySelector('.app-nav-backdrop')) return;

    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'app-nav-backdrop';
    backdrop.setAttribute('aria-label', 'Fechar menu de navegação');
    backdrop.addEventListener('click', fecharTodosMenusMobile);
    document.body.appendChild(backdrop);

    menus.forEach((nav, indice) => {
        const botao = nav.querySelector('.app-nav-toggle');
        const links = nav.querySelector('.app-nav-links');
        if (!botao || !links) return;
        const linksId = links.id || `app-nav-links-${indice + 1}`;
        links.id = linksId;
        botao.setAttribute('aria-controls', linksId);
        botao.setAttribute('aria-label', 'Abrir menu de navegação');
        links.setAttribute('aria-hidden', window.innerWidth <= 768 ? 'true' : 'false');
        links.addEventListener('click', event => {
            if (event.target.closest('a')) fecharTodosMenusMobile();
        });
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') fecharTodosMenusMobile();
    });
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            fecharTodosMenusMobile();
            menus.forEach(nav => nav.querySelector('.app-nav-links')?.setAttribute('aria-hidden', 'false'));
        } else {
            menus.forEach(nav => {
                if (!nav.classList.contains('is-open')) {
                    nav.querySelector('.app-nav-links')?.setAttribute('aria-hidden', 'true');
                }
            });
        }
    });
}

injetarEstilosComuns();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarMenuMobile, { once: true });
} else {
    inicializarMenuMobile();
}
