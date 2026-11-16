import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch, getApiBaseUrl, safeParseJsonResponse } from '../../utils/api';
import { SocialFeedShowcase } from '../SocialFeedShowcase';
import { 
  Building2, 
  CreditCard, 
  MessageCircle, 
  CheckCircle2, 
  Save,
  ExternalLink,
  ShieldCheck,
  Link2,
  Unlink,
  AlertCircle,
  Loader2,
  PauseCircle,
  PlayCircle,
  Landmark,
  Share2,
  Instagram,
  Facebook,
  Youtube,
  Play,
  Sparkles
} from 'lucide-react';

export const AdminProfileSettings: React.FC = () => {
  const { businessProfile, updateBusinessProfile, currentAdminUser } = useApp();

  const [ownerName, setOwnerName] = useState(businessProfile.ownerName || '');
  const [complexName, setComplexName] = useState(businessProfile.complexName || '');
  const [cbu, setCbu] = useState(businessProfile.cbu || '');
  const [alias, setAlias] = useState(businessProfile.alias || '');
  const [accountHolder, setAccountHolder] = useState(businessProfile.accountHolder || '');
  const [whatsappNumber, setWhatsappNumber] = useState(businessProfile.whatsappNumber || '');
  const [address, setAddress] = useState(businessProfile.address || '');
  const [email, setEmail] = useState(businessProfile.email || '');
  const [welcomeNotes, setWelcomeNotes] = useState(businessProfile.welcomeNotes || '');
  const [mpLink, setMpLink] = useState(businessProfile.mpLink || '');
  const [mpAccessToken, setMpAccessToken] = useState(businessProfile.mpAccessToken || '');
  const [whatsappTemplate, setWhatsappTemplate] = useState(businessProfile.whatsappTemplate || '');
  const [instagramUrl, setInstagramUrl] = useState(businessProfile.instagramUrl || '');
  const [facebookUrl, setFacebookUrl] = useState(businessProfile.facebookUrl || '');
  const [tiktokUrl, setTiktokUrl] = useState(businessProfile.tiktokUrl || '');
  const [youtubeUrl, setYoutubeUrl] = useState(businessProfile.youtubeUrl || '');
  const [socialFeedUrl, setSocialFeedUrl] = useState(businessProfile.socialFeedUrl || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Mercado Pago 3P OAuth state
  const [oauthServerConfigured, setOauthServerConfigured] = useState<boolean>(true);
  const [oauthDiag, setOauthDiag] = useState<{
    hasClientId?: boolean;
    hasClientSecret?: boolean;
    vercelEnv?: string | null;
    host?: string | null;
    detectedEnvKeys?: string[];
  } | null>(null);
  const [isConnectingMP, setIsConnectingMP] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSuccessNotice, setOauthSuccessNotice] = useState<string | null>(null);

  const rawAdminKey = (currentAdminUser?.username || currentAdminUser?.id || 'admin')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  const adminIdKey = rawAdminKey || 'admin';

  // Check if MP OAuth platform credentials are configured on server
  useEffect(() => {
    apiFetch(`/api/mercadopago/oauth/status?adminId=${encodeURIComponent(adminIdKey)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    })
      .then(safeParseJsonResponse)
      .then(data => {
        setOauthServerConfigured(Boolean(data?.configured));
        setOauthDiag({
          hasClientId: data?.hasClientId,
          hasClientSecret: data?.hasClientSecret,
          vercelEnv: data?.vercelEnv,
          host: data?.host,
          detectedEnvKeys: Array.isArray(data?.detectedEnvKeys) ? data.detectedEnvKeys : [],
        });
      })
      .catch(() => {});
  }, [adminIdKey]);

  // Listen for OAuth popup postMessage completion
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      const apiBase = getApiBaseUrl();
      const isTrustedApiOrigin = Boolean(apiBase) && origin === apiBase;
      if (
        !isTrustedApiOrigin &&
        !origin.endsWith('.run.app') &&
        !origin.endsWith('.onrender.com') &&
        !origin.endsWith('.koyeb.app') &&
        !origin.endsWith('.vercel.app') &&
        !origin.includes('localhost') &&
        !origin.includes('deportespmy.com.ar') &&
        origin !== window.location.origin
      ) {
        return;
      }

      if (event.data?.type === 'MP_OAUTH_SUCCESS') {
        const mpData = event.data.mpData || {};
        await updateBusinessProfile({
          mpOAuthConnected: true,
          mpUserId: mpData.mpUserId || '',
          mpAccountNickname: mpData.mpAccountNickname || '',
          mpAccountEmail: mpData.mpAccountEmail || '',
          mpAccessToken: mpData.mpAccessToken || '',
          mpRefreshToken: mpData.mpRefreshToken || '',
          mpPublicKey: mpData.mpPublicKey || '',
          mpTokenExpiresAt: mpData.mpTokenExpiresAt || '',
          mpConnectedAt: mpData.mpConnectedAt || new Date().toISOString(),
        });
        setIsConnectingMP(false);
        setOauthError(null);
        setOauthSuccessNotice(
          `¡Cuenta vinculada con éxito${mpData.mpAccountNickname ? `: @${mpData.mpAccountNickname}` : ''}!`
        );
        setTimeout(() => setOauthSuccessNotice(null), 6000);
      } else if (event.data?.type === 'MP_OAUTH_ERROR') {
        setIsConnectingMP(false);
        setOauthError(event.data.error || 'No se pudo completar la vinculación con Mercado Pago.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [updateBusinessProfile]);

  // Synchronize form inputs when businessProfile updates or a different admin logs in
  useEffect(() => {
    setOwnerName(businessProfile.ownerName || '');
    setComplexName(businessProfile.complexName || '');
    setCbu(businessProfile.cbu || '');
    setAlias(businessProfile.alias || '');
    setAccountHolder(businessProfile.accountHolder || '');
    setWhatsappNumber(businessProfile.whatsappNumber || '');
    setAddress(businessProfile.address || '');
    setEmail(businessProfile.email || '');
    setWelcomeNotes(businessProfile.welcomeNotes || '');
    setMpLink(businessProfile.mpLink || '');
    setMpAccessToken(businessProfile.mpAccessToken || '');
    setWhatsappTemplate(businessProfile.whatsappTemplate || '');
    setInstagramUrl(businessProfile.instagramUrl || '');
    setFacebookUrl(businessProfile.facebookUrl || '');
    setTiktokUrl(businessProfile.tiktokUrl || '');
    setYoutubeUrl(businessProfile.youtubeUrl || '');
    setSocialFeedUrl(businessProfile.socialFeedUrl || '');
  }, [businessProfile]);

  const handleConnectMercadoPago = async () => {
    setOauthError(null);
    setIsConnectingMP(true);

    try {
      const response = await apiFetch(`/api/mercadopago/oauth/url?adminId=${encodeURIComponent(adminIdKey)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const data = await safeParseJsonResponse(response);

      if (!response.ok || !data?.url) {
        setOauthError(data?.error || 'No se pudo iniciar la conexión con Mercado Pago.');
        setIsConnectingMP(false);
        return;
      }

      const authWindow = window.open(
        data.url,
        'mp_oauth_popup',
        'width=640,height=740,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        setOauthError('El navegador bloqueó la ventana emergente. Habilitá los popups para este sitio e intentá de nuevo.');
        setIsConnectingMP(false);
        return;
      }

      // Reset spinner if popup is closed manually without completing
      const closedCheck = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(closedCheck);
          setIsConnectingMP(false);
        }
      }, 600);
    } catch (err: any) {
      setOauthError(err?.message || 'Error de red al conectar con Mercado Pago.');
      setIsConnectingMP(false);
    }
  };

  const handleDisconnectMercadoPago = async () => {
    try {
      await apiFetch('/api/mercadopago/oauth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: adminIdKey })
      });
    } catch {}

    await updateBusinessProfile({
      mpOAuthConnected: false,
      mpUserId: '',
      mpAccountEmail: '',
      mpAccountNickname: '',
      mpAccessToken: '',
      mpRefreshToken: '',
      mpPublicKey: '',
      mpTokenExpiresAt: '',
      mpConnectedAt: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBusinessProfile({
      ownerName: ownerName.trim(),
      complexName: complexName.trim(),
      cbu: cbu.trim(),
      alias: alias.trim().toUpperCase(),
      accountHolder: accountHolder.trim(),
      whatsappNumber: whatsappNumber.trim(),
      address: address.trim(),
      email: email.trim(),
      welcomeNotes: welcomeNotes.trim(),
      mpLink: mpLink.trim(),
      mpAccessToken: mpAccessToken.trim(),
      whatsappTemplate: whatsappTemplate.trim(),
      instagramUrl: instagramUrl.trim(),
      facebookUrl: facebookUrl.trim(),
      tiktokUrl: tiktokUrl.trim(),
      youtubeUrl: youtubeUrl.trim(),
      socialFeedUrl: socialFeedUrl.trim()
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const isMpConnected = Boolean(businessProfile.mpOAuthConnected);
  const isMpPaused = Boolean(businessProfile.mpPaused);
  const isTransferPaused = Boolean(businessProfile.transferPaused);

  const handleTogglePause = async (method: 'mp' | 'transfer') => {
    if (method === 'mp') {
      await updateBusinessProfile({ mpPaused: !isMpPaused });
    } else {
      await updateBusinessProfile({ transferPaused: !isTransferPaused });
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-soft-text)] block mb-0.5">
            Configuración del Establecimiento
          </span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-heading">
            Información del Administrador & Cobros Automáticos
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Vinculá tu cuenta de Mercado Pago en 1 clic para recibir pagos y confirmar turnos automáticamente sin intervención manual.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>¡Datos guardados con éxito!</span>
          </div>
        )}
      </div>

      {/* MERCADO PAGO 1-CLICK OAUTH CONNECTION */}
      <div className={`p-6 rounded-xl border space-y-4 ${
        isMpConnected
          ? 'bg-[var(--bg-surface)] border-emerald-500/40'
          : 'bg-[var(--bg-surface)] border-[var(--border-hairline)]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--mp-brand)]">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cobro Automático por Complejo (OAuth)</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
              {isMpConnected ? 'Cuenta de Mercado Pago Vinculada' : 'Conectá tu Mercado Pago en 1 Clic'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              {isMpConnected
                ? 'Cada reserva de tus canchas se cobra directamente en tu cuenta de Mercado Pago y el turno se confirma automáticamente al aprobarse el pago.'
                : 'Autorizá tu cuenta personal o comercial de Mercado Pago sin copiar tokens ni configurar claves técnicas. Los pagos irán directo a tu cuenta.'}
            </p>
          </div>

          {isMpConnected ? (
            <button
              type="button"
              onClick={handleDisconnectMercadoPago}
              className="px-4 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-center shrink-0"
            >
              <Unlink className="w-4 h-4" />
              <span>Desconectar Cuenta</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isConnectingMP}
              onClick={handleConnectMercadoPago}
              className="px-5 py-2.5 rounded-lg bg-[var(--mp-brand)] hover:opacity-90 disabled:opacity-60 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-opacity cursor-pointer self-start sm:self-center shrink-0"
            >
              {isConnectingMP ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Esperando autorización...</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  <span>Conectar con Mercado Pago</span>
                </>
              )}
            </button>
          )}
        </div>

        {isMpConnected && (
          <div className="bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)] block">Cuenta Conectada</span>
              <strong className="text-[var(--text-primary)] font-bold">
                {businessProfile.mpAccountNickname || businessProfile.ownerName || 'Usuario Mercado Pago'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)] block">Email / ID MP</span>
              <span className="font-mono text-[var(--text-secondary)] font-semibold">
                {businessProfile.mpAccountEmail || `ID ${businessProfile.mpUserId || 'Vinculado'}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)] block">Estado de Automatización</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Checkout Pro + Webhook Activo
              </span>
            </div>
          </div>
        )}

        {oauthSuccessNotice && (
          <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{oauthSuccessNotice}</span>
          </div>
        )}

        {oauthError && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{oauthError}</span>
          </div>
        )}

        {!oauthServerConfigured && !isMpConnected && (
          <div className="p-3.5 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Faltan configurar las credenciales OAuth de la plataforma</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-200/90">
                El servidor{oauthDiag?.host ? ` (${oauthDiag.host}${oauthDiag.vercelEnv ? ` · ${oauthDiag.vercelEnv}` : ''})` : ''} reporta:{' '}
                <code className="font-mono bg-amber-500/20 px-1 rounded">
                  MP_CLIENT_ID: {oauthDiag?.hasClientId ? 'OK' : 'FALTA'}
                </code>{' '}
                ·{' '}
                <code className="font-mono bg-amber-500/20 px-1 rounded">
                  MP_CLIENT_SECRET: {oauthDiag?.hasClientSecret ? 'OK' : 'FALTA'}
                </code>
                .
                {oauthDiag?.detectedEnvKeys && (
                  <>
                    {' '}Claves detectadas:{' '}
                    <code className="font-mono bg-amber-500/20 px-1 rounded">
                      {oauthDiag.detectedEnvKeys.length > 0 ? oauthDiag.detectedEnvKeys.join(', ') : 'ninguna'}
                    </code>
                    .
                  </>
                )}{' '}
                Si ya las cargaste en Vercel, asegurate de marcar Production/Preview y hacer <strong>Redeploy</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* PAYMENT METHODS STATUS & PAUSE CONTROLS */}
      <div className="bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border-hairline)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-hairline)] pb-3">
          <div>
            <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
              <span>Control de Medios de Pago (Pausar / Activar en Reservas)</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Si necesitás suspender temporalmente un medio de cobro, los jugadores verán el método marcado como <strong>Suspendido</strong> y no podrán operar con él.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Mercado Pago Pause Card */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            isMpPaused ? 'bg-rose-500/10 border-rose-500/35' : 'bg-emerald-500/10 border-emerald-500/35'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text-primary)] inline-flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                  Mercado Pago
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isMpPaused ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {isMpPaused ? 'Pausado / Suspendido' : 'Activo'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {isMpPaused
                  ? 'Los jugadores ven Mercado Pago como suspendido y no pueden pagar por este medio.'
                  : 'Habilitado en el modal de reserva (según OAuth o Alias/Link configurado).'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleTogglePause('mp')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                isMpPaused
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-[#090D12]'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {isMpPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              <span>{isMpPaused ? 'Reactivar' : 'Pausar'}</span>
            </button>
          </div>

          {/* Bank Transfer / CBU Pause Card */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            isTransferPaused ? 'bg-rose-500/10 border-rose-500/35' : 'bg-emerald-500/10 border-emerald-500/35'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text-primary)] inline-flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  Transferencia CBU / Banco
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isTransferPaused ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {isTransferPaused ? 'Pausado / Suspendido' : 'Activo'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {isTransferPaused
                  ? 'Las transferencias bancarias están suspendidas y bloqueadas para los jugadores.'
                  : 'Disponible siempre que hayas cargado tu CBU o Alias abajo.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleTogglePause('transfer')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                isTransferPaused
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-[#090D12]'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {isTransferPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              <span>{isTransferPaused ? 'Reactivar' : 'Pausar'}</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Complex & Administrator Identity */}
        <div className="bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border-hairline)] space-y-4">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-sm border-b border-[var(--border-hairline)] pb-3">
            <Building2 className="w-4 h-4 text-[var(--accent)]" />
            <span>Identidad del Complejo Deportivo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1">Nombre y Apellido del Responsable</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Ej: Marcelo Gallardo"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1">Nombre Comercial del Complejo / Club</label>
              <input
                type="text"
                required
                value={complexName}
                onChange={(e) => setComplexName(e.target.value)}
                placeholder="Ej: Complejo Deportivo Costanera PMY"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Financial Details for Transfer / CBU Fallback */}
        <div className="bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border-hairline)] space-y-4">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-sm border-b border-[var(--border-hairline)] pb-3">
            <CreditCard className="w-4 h-4 text-[var(--accent)]" />
            <span>Transferencia Bancaria / CBU & Alias (Alternativa manual)</span>
          </div>

          <p className="text-xs text-[var(--text-secondary)]">
            Si además ofrecés transferencia manual por CBU o Alias, completá estos datos para que el jugador pueda transferir y subir su comprobante.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1">Alias de Mercado Pago / Banco</label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Ej: DEPORTES.PMY.MP"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs font-mono font-bold text-[var(--accent-soft-text)]"
              />
            </div>

            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1">CBU / CVU Bancario (22 dígitos)</label>
              <input
                type="text"
                value={cbu}
                onChange={(e) => setCbu(e.target.value)}
                placeholder="Ej: 0000003100012345678901"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs font-mono text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1">Titular de la Cuenta</label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Ej: Deportes Puerto Madryn SRL"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="font-semibold text-[var(--text-secondary)] block mb-1 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-[var(--mp-brand)]" />
                <span>Link Personal de Mercado Pago (Opcional)</span>
              </label>
              <input
                type="url"
                value={mpLink}
                onChange={(e) => setMpLink(e.target.value)}
                placeholder="Ej: https://link.mercadopago.com.ar/micomplejo"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs font-mono text-[var(--text-primary)]"
              />
            </div>

            <details className="sm:col-span-3 pt-2 border-t border-[var(--border-hairline)]">
              <summary className="text-[11px] font-semibold text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Opciones avanzadas (Token manual solo si no usás el botón de 1 clic)</span>
              </summary>
              <div className="mt-2">
                <input
                  type="password"
                  value={mpAccessToken}
                  onChange={(e) => setMpAccessToken(e.target.value)}
                  placeholder="APP_USR-... (se completa automáticamente al conectar con OAuth)"
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs font-mono text-[var(--text-primary)]"
                />
              </div>
            </details>
          </div>
        </div>

        {/* Section 3: Contact & Address Details */}
        <div className="bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border-hairline)] space-y-4">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-sm border-b border-[var(--border-hairline)] pb-3">
            <MessageCircle className="w-4 h-4 text-[var(--accent)]" />
            <span>Contacto, WhatsApp & Ubicación del Complejo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1">Número de WhatsApp (con código de país)</label>
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Ej: +5492804567890"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)] font-mono"
              />
              <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Desde este número se abrirán las notificaciones a los jugadores</span>
            </div>

            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1">Correo Electrónico de Contacto</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reservas@deportespmy.com.ar"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1">Dirección Física en Puerto Madryn</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Boulevard Brown 1420 (Costanera frente al mar)"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[var(--text-secondary)] block mb-1">Instrucciones o Aclaraciones para el Jugador</label>
            <textarea
              rows={2}
              value={welcomeNotes}
              onChange={(e) => setWelcomeNotes(e.target.value)}
              placeholder="Ej: Presentarse 10 minutos antes. Contamos con vestuarios con agua caliente, alquiler de paletas y buffet..."
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
            />
            <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Este texto se agregará automáticamente al final de cada confirmación de WhatsApp</span>
          </div>

          <div>
            <label className="font-semibold text-[var(--text-secondary)] block mb-1 flex items-center justify-between">
              <span>Plantilla Personalizada del Mensaje de WhatsApp</span>
              <span className="text-[10px] text-[var(--text-muted)] font-normal">Variables: {'{nombre}, {complejo}, {cancha}, {fecha}, {inicio}, {fin}, {codigo}, {total}, {abonado}, {saldo}, {alias}, {direccion}'}</span>
            </label>
            <textarea
              rows={4}
              value={whatsappTemplate}
              onChange={(e) => setWhatsappTemplate(e.target.value)}
              placeholder="Ej: *¡Hola {nombre}!* Tu reserva en *{complejo}* para la cancha *{cancha}* el {fecha} de {inicio} a {fin} hs está confirmada. Código: #{codigo}. Total: {total}. Abonado: {abonado}. Saldo restante: {saldo}. Alias: {alias}. Dirección: {direccion}."
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-3 text-xs text-[var(--text-primary)] font-mono"
            />
            <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
              Si dejás este campo vacío, el sistema utilizará la plantilla profesional predeterminada.
            </span>
          </div>
        </div>

        {/* Section 4: Social Media Links & Live Feed Embed */}
        <div className="bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border-hairline)] space-y-4">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-sm border-b border-[var(--border-hairline)] pb-3">
            <Share2 className="w-4 h-4 text-[var(--accent)]" />
            <span>Redes Sociales &amp; Feed en Vivo del Complejo</span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Vinculá las cuentas oficiales de tu complejo para que aparezcan en el directorio de complejos y dentro de tu perfil público con acceso directo y publicación destacada en vivo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-600" />
                <span>Instagram (URL o @usuario)</span>
              </label>
              <input
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="Ej: @complejocostanera o https://instagram.com/..."
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1 flex items-center gap-1.5">
                <Facebook className="w-3.5 h-3.5 text-blue-600" />
                <span>Facebook (URL de la página)</span>
              </label>
              <input
                type="text"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="Ej: https://www.facebook.com/micomplejo"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                <span>TikTok (URL o @usuario)</span>
              </label>
              <input
                type="text"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="Ej: @complejo.pmy o https://tiktok.com/@..."
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1 flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5 text-rose-600" />
                <span>YouTube (Canal o video institucional)</span>
              </label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Ej: https://www.youtube.com/@micomplejo"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-[var(--text-secondary)] block mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Publicación, Reel o Feed Destacado para Incrustar en Vivo (Opcional)</span>
              </label>
              <input
                type="text"
                value={socialFeedUrl}
                onChange={(e) => setSocialFeedUrl(e.target.value)}
                placeholder="Pegá el link de un post/reel de Instagram, página de Facebook o video/short de YouTube"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs font-mono text-[var(--text-primary)]"
              />
              <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                Si dejás este campo vacío y cargaste Instagram/Facebook arriba, mostraremos automáticamente tu perfil vinculado.
              </span>
            </div>
          </div>

          {(instagramUrl || facebookUrl || tiktokUrl || youtubeUrl || socialFeedUrl) && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Vista previa en perfil del complejo:
              </p>
              <SocialFeedShowcase
                profile={{
                  instagramUrl,
                  facebookUrl,
                  tiktokUrl,
                  youtubeUrl,
                  socialFeedUrl,
                }}
                complexName={complexName || 'Tu Complejo'}
              />
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Información del Administrador</span>
          </button>
        </div>

      </form>

    </div>
  );
};
