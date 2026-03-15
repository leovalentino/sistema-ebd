const API_URL = ''

function injetarEstilosMenuMobile() {
    if (document.getElementById('app-nav-mobile-styles')) return;

    const style = document.createElement('style');
    style.id = 'app-nav-mobile-styles';
    style.textContent = `
        .app-nav {
            margin-bottom: 1.5rem;
        }

        .app-nav-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .app-nav-brand {
            display: flex;
            align-items: center;
            min-height: 44px;
        }

        .app-nav-brand strong {
            font-size: 1rem;
            color: inherit;
        }

        .app-nav-toggle {
            display: none;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-width: auto;
            margin: 0;
            padding: 10px 14px;
            border: 1px solid rgba(255,255,255,0.18);
            border-radius: 999px;
            background: #1e88e5;
            color: #fff;
            font-weight: 700;
            cursor: pointer;
        }

        .app-nav-toggle:hover {
            background: #1565c0;
        }

        .app-nav-links {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .app-nav-links a[role="button"] {
            margin-bottom: 0;
            white-space: nowrap;
        }

        @media (max-width: 720px) {
            .app-nav {
                display: block;
                padding: 14px 16px;
                background: #11191f;
                border-radius: 14px;
                box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
            }

            .app-nav ul {
                margin: 0;
                padding: 0;
                list-style: none;
            }

            .app-nav-toggle {
                display: inline-flex;
            }

            .app-nav-links {
                display: none;
                width: 100%;
                margin-top: 14px;
                flex-direction: column;
                align-items: stretch;
                gap: 8px;
                padding-top: 14px;
                border-top: 1px solid rgba(255,255,255,0.12);
            }

            .app-nav.aberto .app-nav-links {
                display: flex;
            }

            .app-nav-links li,
            .app-nav-links a[role="button"] {
                width: 100%;
            }

            .app-nav-links a[role="button"] {
                display: block;
                text-align: center;
            }

            .app-nav strong {
                color: #fff;
            }
        }
    `;

    document.head.appendChild(style);
}

function fecharTodosMenusMobile() {
    document.querySelectorAll('.app-nav.aberto').forEach(nav => {
        nav.classList.remove('aberto');
        const botao = nav.querySelector('.app-nav-toggle');
        if (botao) {
            botao.setAttribute('aria-expanded', 'false');
            botao.innerHTML = '<span aria-hidden="true">☰</span><span>Menu</span>';
        }
    });
}

function toggleMobileMenu(botao) {
    const nav = botao.closest('.app-nav');
    if (!nav) return;

    const vaiAbrir = !nav.classList.contains('aberto');
    fecharTodosMenusMobile();

    if (vaiAbrir) {
        nav.classList.add('aberto');
        botao.setAttribute('aria-expanded', 'true');
        botao.innerHTML = '<span aria-hidden="true">✕</span><span>Fechar</span>';
    }
}

function inicializarMenuMobile() {
    const menus = document.querySelectorAll('.app-nav');
    if (!menus.length) return;

    injetarEstilosMenuMobile();

    menus.forEach(nav => {
        nav.querySelectorAll('.app-nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 720) {
                    fecharTodosMenusMobile();
                }
            });
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 720) {
            fecharTodosMenusMobile();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarMenuMobile);
} else {
    inicializarMenuMobile();
}

async function verificarAcesso() {
    // 1. Verifica se já está logado no navegador
    const logado = localStorage.getItem("adm_logado");

    if (logado === "sim") {
        return; // Tudo certo, libera a tela
    }

    // 2. Se não estiver, pede a senha
    const tentativa = prompt("🔒 Área Restrita (Diretoria)\nDigite a senha de administrador:");

    if (!tentativa) {
        // Se cancelou ou deixou vazio
        bloquearAcesso();
        return;
    }

    try {
        // 3. Manda a senha para o servidor verificar
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha: tentativa })
        });

        const dados = await res.json();

        if (dados.sucesso) {
            // 4. Sucesso! Marca como logado
            localStorage.setItem("adm_logado", "sim");
        } else {
            // 5. Erro
            alert("Senha Incorreta! ❌");
            bloquearAcesso();
        }

    } catch (erro) {
        console.error(erro);
        alert("Erro de conexão com o servidor.");
        bloquearAcesso();
    }
}

function bloquearAcesso() {
    document.body.innerHTML = "<h1 style='text-align:center; margin-top:50px; color:red'>🔒 Acesso Negado</h1><p style='text-align:center'>Você será redirecionado...</p>";
    setTimeout(() => window.location.href = "index.html", 2000);
}

async function verificarAcessoUsr() {
    // 1. Verifica se já está logado no navegador
    const logado = localStorage.getItem("prof_logado");

    if (logado === "sim") {
        return; // Tudo certo, libera a tela
    }

    // 2. Se não estiver, pede a senha
    const tentativa = prompt("🔒 Área Restrita (Professor)\nDigite a senha de professor:");

    if (!tentativa) {
        // Se cancelou ou deixou vazio
        bloquearAcesso();
        return;
    }

    try {
        // 3. Manda a senha para o servidor verificar
        const res = await fetch(`${API_URL}/auth/login-usr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha: tentativa })
        });

        const dados = await res.json();

        if (dados.sucesso) {
            // 4. Sucesso! Marca como logado
            localStorage.setItem("prof_logado", "sim");
        } else {
            // 5. Erro
            alert("Senha Incorreta! ❌");
            bloquearAcesso();
        }

    } catch (erro) {
        console.error(erro);
        alert("Erro de conexão com o servidor.");
        bloquearAcesso();
    }
}
