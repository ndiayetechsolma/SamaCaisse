import { SignJWT, jwtVerify } from 'jose';

function sessionSecret() {
  const secret = process.env.PERSONNEL_SESSION_SECRET || '';
  if (!secret) throw new Error('PERSONNEL_SESSION_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

export async function signCompteToken(compte) {
  return new SignJWT({
    type: 'compte',
    role: 'authenticated',
    compteId: compte.id,
    compte_id: compte.id
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(compte.id)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(sessionSecret());
}

export async function getComptePayload(request) {
  const session = await getSession(request);
  return session.identity && session.identity.type === 'compte' ? { compte_id: session.identity.compteId } : null;
}

export async function signSuperAdminToken(superAdmin) {
  return new SignJWT({
    type: 'superadmin',
    superAdminId: superAdmin.id
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(superAdmin.id)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(sessionSecret());
}

export async function getSuperAdminPayload(request) {
  const session = await getSession(request);
  return session.identity && session.identity.type === 'superadmin' ? { super_admin_id: session.identity.superAdminId } : null;
}

export async function getSession(request) {
  const authorization = request.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return { token: null, identity: null };
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (payload.type === 'compte') {
      return { token, identity: { type: 'compte', compteId: payload.compte_id } };
    }
    if (payload.type === 'personnel') {
      return {
        token,
        identity: {
          type: 'personnel',
          compteId: payload.compte_id,
          entrepriseId: payload.entreprise_id,
          magasinId: payload.magasin_id,
          personnelId: payload.personnel_id,
          role: payload.role,
          nom: payload.nom
        }
      };
    }
    if (payload.type === 'superadmin') {
      return { token, identity: { type: 'superadmin', superAdminId: payload.superAdminId } };
    }
  } catch {}
  return { token, identity: null };
}