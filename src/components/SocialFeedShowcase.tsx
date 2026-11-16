import React from 'react';
import { BusinessProfile } from '../types';
import {
  Instagram,
  Facebook,
  Youtube,
  Share2,
  ExternalLink,
  Play,
  Sparkles,
} from 'lucide-react';

interface SocialFeedShowcaseProps {
  profile: Partial<BusinessProfile>;
  complexName: string;
  compact?: boolean;
}

const normalizeUrl = (raw?: string, fallbackBase?: string): string | null => {
  const val = (raw || '').trim();
  if (!val) return null;
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  const cleanHandle = val.replace(/^@/, '').replace(/^\//, '');
  if (!cleanHandle) return null;
  return fallbackBase ? `${fallbackBase}${cleanHandle}` : `https://${cleanHandle}`;
};

type ParsedFeedEmbed =
  | { type: 'instagram_post'; embedUrl: string; externalUrl: string; label: string }
  | { type: 'instagram_profile'; embedUrl: string; externalUrl: string; label: string }
  | { type: 'youtube'; embedUrl: string; externalUrl: string; label: string }
  | { type: 'facebook'; embedUrl: string; externalUrl: string; label: string }
  | { type: 'tiktok_video'; embedUrl: string; externalUrl: string; label: string }
  | { type: 'link'; externalUrl: string; label: string };

export const parseSocialFeedEmbed = (rawUrl?: string): ParsedFeedEmbed | null => {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return null;

  const fullUrl = trimmed.startsWith('http')
    ? trimmed
    : trimmed.startsWith('@')
      ? `https://www.instagram.com/${trimmed.slice(1)}/`
      : `https://${trimmed}`;

  try {
    const parsed = new URL(fullUrl);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, '');

    // Instagram post / reel / tv
    if (host.includes('instagram.com')) {
      const postMatch = path.match(/^\/(p|reel|tv)\/([^/?#]+)/i);
      if (postMatch) {
        const kind = postMatch[1].toLowerCase();
        const code = postMatch[2];
        return {
          type: 'instagram_post',
          embedUrl: `https://www.instagram.com/${kind}/${code}/embed/captioned/`,
          externalUrl: fullUrl,
          label: kind === 'reel' ? 'Reel destacado de Instagram' : 'Publicación de Instagram',
        };
      }
      const profileSlug = path.split('/').filter(Boolean)[0];
      if (profileSlug) {
        return {
          type: 'instagram_profile',
          embedUrl: `https://www.instagram.com/${profileSlug}/embed`,
          externalUrl: `https://www.instagram.com/${profileSlug}/`,
          label: `Feed de Instagram (@${profileSlug})`,
        };
      }
    }

    // YouTube watch / shorts / youtu.be
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let videoId = '';
      if (host.includes('youtu.be')) {
        videoId = path.replace(/^\//, '').split('/')[0];
      } else if (path.startsWith('/shorts/')) {
        videoId = path.replace('/shorts/', '').split('/')[0];
      } else if (path.startsWith('/embed/')) {
        videoId = path.replace('/embed/', '').split('/')[0];
      } else {
        videoId = parsed.searchParams.get('v') || '';
      }
      if (videoId) {
        return {
          type: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          externalUrl: fullUrl,
          label: 'Video destacado en YouTube',
        };
      }
    }

    // Facebook Page timeline plugin
    if (host.includes('facebook.com') || host.includes('fb.com')) {
      return {
        type: 'facebook',
        embedUrl: `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(fullUrl)}&tabs=timeline&width=500&height=420&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`,
        externalUrl: fullUrl,
        label: 'Actividad reciente en Facebook',
      };
    }

    // TikTok video
    if (host.includes('tiktok.com')) {
      const videoMatch = path.match(/\/video\/(\d+)/);
      if (videoMatch) {
        return {
          type: 'tiktok_video',
          embedUrl: `https://www.tiktok.com/embed/v2/${videoMatch[1]}`,
          externalUrl: fullUrl,
          label: 'Video en TikTok',
        };
      }
    }

    return {
      type: 'link',
      externalUrl: fullUrl,
      label: 'Publicación social destacada',
    };
  } catch {
    return null;
  }
};

export const SocialFeedShowcase: React.FC<SocialFeedShowcaseProps> = ({
  profile,
  complexName,
  compact = false,
}) => {
  const igUrl = normalizeUrl(profile.instagramUrl, 'https://www.instagram.com/');
  const fbUrl = normalizeUrl(profile.facebookUrl, 'https://www.facebook.com/');
  const ttUrl = normalizeUrl(profile.tiktokUrl, 'https://www.tiktok.com/@');
  const ytUrl = normalizeUrl(profile.youtubeUrl, 'https://www.youtube.com/');

  const feedTarget = profile.socialFeedUrl?.trim() || igUrl || ytUrl || fbUrl || '';
  const embed = parseSocialFeedEmbed(feedTarget);

  const hasSocialLinks = Boolean(igUrl || fbUrl || ttUrl || ytUrl || embed);
  if (!hasSocialLinks) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {igUrl && (
          <a
            href={igUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-700 dark:text-pink-300 border border-pink-500/30 text-[11px] font-semibold transition-colors"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>Instagram</span>
          </a>
        )}
        {fbUrl && (
          <a
            href={fbUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-[11px] font-semibold transition-colors"
          >
            <Facebook className="w-3.5 h-3.5" />
            <span>Facebook</span>
          </a>
        )}
        {ttUrl && (
          <a
            href={ttUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)] text-[11px] font-semibold transition-colors"
          >
            <Play className="w-3 h-3" />
            <span>TikTok</span>
          </a>
        )}
        {ytUrl && (
          <a
            href={ytUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition-colors"
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>YouTube</span>
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-hairline)] p-6 space-y-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-hairline)]">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-soft-text)]">
            <Share2 className="w-3.5 h-3.5" />
            <span>Redes Sociales &amp; Novedades</span>
          </div>
          <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
            Comunidad oficial de {complexName}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {igUrl && (
            <a
              href={igUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-rose-500 hover:opacity-90 text-white text-xs font-semibold transition-opacity shadow-xs"
            >
              <Instagram className="w-3.5 h-3.5" />
              <span>Instagram</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          )}
          {fbUrl && (
            <a
              href={fbUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <Facebook className="w-3.5 h-3.5" />
              <span>Facebook</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          )}
          {ttUrl && (
            <a
              href={ttUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-semibold transition-colors shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>TikTok</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          )}
          {ytUrl && (
            <a
              href={ytUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <Youtube className="w-3.5 h-3.5" />
              <span>YouTube</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          )}
        </div>
      </div>

      {embed && embed.type !== 'link' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{embed.label}</span>
            </span>
            <a
              href={embed.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[var(--accent-soft-text)] hover:underline font-semibold"
            >
              <span>Abrir publicación original</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="rounded-xl overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-subtle)]">
            <iframe
              src={embed.embedUrl}
              title={`Feed social de ${complexName}`}
              className={`w-full border-0 ${
                embed.type === 'youtube' ? 'aspect-video max-h-[400px]' : 'h-[430px]'
              }`}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      ) : embed ? (
        <a
          href={embed.externalUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--accent-soft)] border border-[var(--border-hairline)] transition-colors text-xs"
        >
          <span className="font-semibold text-[var(--text-primary)]">
            Ver novedades y publicaciones recientes de {complexName}
          </span>
          <ExternalLink className="w-4 h-4 text-[var(--accent-soft-text)]" />
        </a>
      ) : null}
    </div>
  );
};
