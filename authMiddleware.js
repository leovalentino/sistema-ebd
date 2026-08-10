const ROLES_VALIDAS = new Set(['admin', 'professor']);

function criarMiddlewareAutenticacao(admin, db) {
  async function autenticar(req, res, next) {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return res.status(401).json({ erro: 'Autenticação necessária' });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(match[1]);
    } catch (erro) {
      console.error('Token Firebase rejeitado:', erro.code || erro.message);
      return res.status(401).json({ erro: 'Token inválido ou expirado' });
    }

    if (!decodedToken.email || decodedToken.email_verified !== true) {
      return res.status(403).json({ erro: 'Conta não autorizada' });
    }

    try {
      const email = decodedToken.email.trim().toLowerCase();
      const doc = await db.collection('usuariosAutorizados').doc(email).get();
      const usuario = doc.exists ? doc.data() : null;

      if (!usuario || usuario.ativo !== true || !ROLES_VALIDAS.has(usuario.role)) {
        return res.status(403).json({ erro: 'Conta não autorizada' });
      }

      req.user = {
        uid: decodedToken.uid,
        email,
        nome: usuario.nome || decodedToken.name || email,
        role: usuario.role
      };
      return next();
    } catch (erro) {
      console.error('Falha ao consultar autorização do usuário:', erro.code || erro.message);
      return res.status(500).json({ erro: 'Erro interno ao verificar autorização' });
    }
  }

  function exigirRole(...roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ erro: 'Acesso não autorizado para este recurso' });
      }
      return next();
    };
  }

  return { autenticar, exigirRole };
}

module.exports = criarMiddlewareAutenticacao;
