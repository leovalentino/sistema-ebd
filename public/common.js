const API_URL = ''

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
