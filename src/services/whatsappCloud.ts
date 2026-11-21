import { apiFetch, safeParseJsonResponse } from '../utils/api';
import { Booking, BusinessProfile } from '../types';

export interface WhatsAppCloudSendResult {
  ok: boolean;
  configured: boolean;
  status: 'sent' | 'failed';
  messageId?: string;
  to?: string;
  preview?: string;
  error?: string;
}

export interface WhatsAppCloudBatchResult {
  ok: boolean;
  configured: boolean;
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
  results: Array<{
    name: string;
    phone: string;
    ok: boolean;
    messageId?: string;
    error?: string;
  }>;
  error?: string;
}

export interface WhatsAppCloudStatus {
  configured: boolean;
  hasAccessToken: boolean;
  hasPhoneNumberId: boolean;
  hasBookingTemplate: boolean;
  hasBookingApprovedTemplate: boolean;
  hasBookingCancelledTemplate: boolean;
  hasMissingPlayersTemplate: boolean;
  hasTournamentCreatedTemplate: boolean;
  apiVersion: string;
}

export async function getWhatsAppCloudStatus(): Promise<WhatsAppCloudStatus> {
  try {
    const resp = await apiFetch('/api/whatsapp/status', {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) {
      return {
        configured: false,
        hasAccessToken: false,
        hasPhoneNumberId: false,
        hasBookingTemplate: false,
        hasBookingApprovedTemplate: false,
        hasBookingCancelledTemplate: false,
        hasMissingPlayersTemplate: false,
        hasTournamentCreatedTemplate: false,
        apiVersion: 'v21.0',
      };
    }
    const data = await safeParseJsonResponse(resp);
    return {
      configured: Boolean(data?.configured),
      hasAccessToken: Boolean(data?.hasAccessToken),
      hasPhoneNumberId: Boolean(data?.hasPhoneNumberId),
      hasBookingTemplate: Boolean(data?.hasBookingTemplate),
      hasBookingApprovedTemplate: Boolean(data?.hasBookingApprovedTemplate),
      hasBookingCancelledTemplate: Boolean(data?.hasBookingCancelledTemplate),
      hasMissingPlayersTemplate: Boolean(data?.hasMissingPlayersTemplate),
      hasTournamentCreatedTemplate: Boolean(data?.hasTournamentCreatedTemplate),
      apiVersion: String(data?.apiVersion || 'v21.0'),
    };
  } catch {
    return {
      configured: false,
      hasAccessToken: false,
      hasPhoneNumberId: false,
      hasBookingTemplate: false,
      hasBookingApprovedTemplate: false,
      hasBookingCancelledTemplate: false,
      hasMissingPlayersTemplate: false,
      hasTournamentCreatedTemplate: false,
      apiVersion: 'v21.0',
    };
  }
}

export async function sendBookingConfirmationViaCloud(params: {
  booking: Booking;
  customMessage?: string;
  profile?: Partial<BusinessProfile>;
  eventType?: 'confirmed' | 'approved' | 'cancelled' | 'reminder';
  mpRefunded?: boolean;
}): Promise<WhatsAppCloudSendResult> {
  const { booking, customMessage, profile, eventType = 'confirmed', mpRefunded } = params;
  try {
    const resp = await apiFetch('/api/whatsapp/send-booking-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        eventType,
        customMessage,
        booking: {
          bookingCode: booking.bookingCode,
          courtName: booking.courtName,
          establishment: booking.establishment || profile?.complexName || '',
          sport: booking.sport,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          durationMinutes: booking.durationMinutes,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          totalAmount: booking.totalAmount,
          amountPaid: booking.amountPaid,
          balanceDue: booking.balanceDue,
          paymentMethod: booking.paymentMethod,
          paymentStatus: booking.paymentStatus,
          refundAmount: booking.refundAmount,
          mpRefunded: Boolean(mpRefunded),
          refundReference: booking.refundReference,
          address: profile?.address || '',
          whatsappNumber: profile?.whatsappNumber || '',
          welcomeNotes: profile?.welcomeNotes || '',
        },
      }),
    });

    const data = await safeParseJsonResponse(resp);
    return {
      ok: Boolean(resp.ok && data?.ok),
      configured: Boolean(data?.configured),
      status: resp.ok && data?.ok ? 'sent' : 'failed',
      messageId: data?.messageId ? String(data.messageId) : undefined,
      to: data?.to ? String(data.to) : undefined,
      preview: data?.preview ? String(data.preview) : customMessage,
      error: data?.error ? String(data.error) : !resp.ok ? `Error HTTP ${resp.status}` : undefined,
    };
  } catch (err: any) {
    return {
      ok: false,
      configured: false,
      status: 'failed',
      preview: customMessage,
      error: err?.message || 'Error de conexión con el servidor WhatsApp Cloud.',
    };
  }
}

export async function sendMissingPlayersWhatsAppViaCloud(params: {
  booking: Booking;
  missingPlayers: number;
  message?: string;
  recipients?: Array<{ id?: string; name: string; phone: string }>;
  notifyAvailableToday?: boolean;
  eventType?: 'missing_players' | 'player_invite' | 'player_joined' | 'player_payment_share';
  playerName?: string;
  playerPhone?: string;
  remainingPlayers?: number;
  perPlayerAmount?: number;
}): Promise<WhatsAppCloudBatchResult> {
  const {
    booking,
    missingPlayers,
    message,
    recipients,
    notifyAvailableToday = false,
    eventType = 'missing_players',
    playerName,
    playerPhone,
    remainingPlayers,
    perPlayerAmount,
  } = params;

  try {
    const resp = await apiFetch('/api/whatsapp/notify-missing-players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        eventType,
        missingPlayers,
        message: message?.trim() || '',
        notifyAvailableToday,
        recipients,
        playerName,
        playerPhone,
        remainingPlayers,
        perPlayerAmount,
        booking: {
          bookingCode: booking.bookingCode,
          courtName: booking.courtName,
          establishment: booking.establishment || '',
          sport: booking.sport,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          totalAmount: booking.totalAmount,
          totalPlayers: booking.totalPlayers,
          perPlayerAmount: booking.perPlayerAmount,
        },
      }),
    });

    const data = await safeParseJsonResponse(resp);
    return {
      ok: Boolean(resp.ok && data?.ok),
      configured: Boolean(data?.configured),
      sentCount: Number(data?.sentCount) || 0,
      failedCount: Number(data?.failedCount) || 0,
      totalRecipients: Number(data?.totalRecipients) || 0,
      results: Array.isArray(data?.results) ? data.results : [],
      error: data?.error ? String(data.error) : !resp.ok ? `Error HTTP ${resp.status}` : undefined,
    };
  } catch (err: any) {
    return {
      ok: false,
      configured: false,
      sentCount: 0,
      failedCount: 0,
      totalRecipients: 0,
      results: [],
      error: err?.message || 'Error de conexión con el servidor WhatsApp Cloud.',
    };
  }
}

export async function sendTournamentCreatedWhatsAppViaCloud(params: {
  tournament: {
    id: string;
    title: string;
    sport: string;
    sportLabel?: string;
    establishment?: string;
    date: string;
    endDate?: string;
    startTime: string;
    endTime?: string;
    entryFee: number;
  };
  recipients?: Array<{ name: string; phone: string }>;
  notifyAvailableToday?: boolean;
}): Promise<WhatsAppCloudBatchResult> {
  try {
    const resp = await apiFetch('/api/whatsapp/notify-tournament-created', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        tournament: params.tournament,
        recipients: params.recipients,
        notifyAvailableToday: params.notifyAvailableToday !== false,
      }),
    });

    const data = await safeParseJsonResponse(resp);
    return {
      ok: Boolean(resp.ok && data?.ok),
      configured: Boolean(data?.configured),
      sentCount: Number(data?.sentCount) || 0,
      failedCount: Number(data?.failedCount) || 0,
      totalRecipients: Number(data?.totalRecipients) || 0,
      results: Array.isArray(data?.results) ? data.results : [],
      error: data?.error ? String(data.error) : !resp.ok ? `Error HTTP ${resp.status}` : undefined,
    };
  } catch (err: any) {
    return {
      ok: false,
      configured: false,
      sentCount: 0,
      failedCount: 0,
      totalRecipients: 0,
      results: [],
      error: err?.message || 'Error de conexión con el servidor WhatsApp Cloud.',
    };
  }
}

export interface WhatsAppWebhookEventItem {
  receivedAt: string;
  messageId: string;
  status: string;
  recipientMasked: string;
  errorCode?: number;
  errorTitle?: string;
  errorDetails?: string;
}

export interface WhatsAppCloudDiagnostics {
  configured: boolean;
  hasAccessToken: boolean;
  hasPhoneNumberId: boolean;
  apiVersion: string;
  templateLang: string;
  webhookVerifyTokenCustom: boolean;
  templates: {
    bookingConfirmed: string | null;
    bookingApproved: string | null;
    bookingCancelled: string | null;
    missingPlayers: string | null;
    tournamentCreated: string | null;
  };
  metaPhoneInfo: {
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    qualityRating: string | null;
    codeVerificationStatus: string | null;
    nameStatus: string | null;
    status: string | null;
    platformType: string | null;
    accountMode: string | null;
  } | null;
  metaPhoneError: string | null;
  webhookEvents: WhatsAppWebhookEventItem[];
}

export async function getWhatsAppCloudDiagnostics(): Promise<WhatsAppCloudDiagnostics | null> {
  try {
    const resp = await apiFetch('/api/whatsapp/diagnostics', {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) return null;
    return await safeParseJsonResponse(resp);
  } catch {
    return null;
  }
}

export async function sendWhatsAppCloudTest(params: {
  to: string;
  mode: string;
  languageCode?: string;
}): Promise<{
  ok: boolean;
  messageId?: string;
  formattedTo?: string;
  templateUsed?: string;
  languageUsed?: string;
  error?: string;
}> {
  try {
    const resp = await apiFetch('/api/whatsapp/test-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await safeParseJsonResponse(resp);
    return {
      ok: Boolean(resp.ok && data?.ok),
      messageId: data?.messageId ? String(data.messageId) : undefined,
      formattedTo: data?.formattedTo ? String(data.formattedTo) : undefined,
      templateUsed: data?.templateUsed ? String(data.templateUsed) : undefined,
      languageUsed: data?.languageUsed ? String(data.languageUsed) : undefined,
      error: data?.error ? String(data.error) : !resp.ok ? `Error HTTP ${resp.status}` : undefined,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Error ejecutando prueba de envío WhatsApp Cloud.',
    };
  }
}

