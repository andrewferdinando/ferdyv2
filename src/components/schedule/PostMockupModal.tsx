'use client';

import React, { useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { SocialAccountSummary } from '@/hooks/useSocialAccounts';
import { getChannelLabel } from '@/lib/channels';

type MockupAsset = {
  id: string;
  title?: string;
  aspect_ratio: string;
  asset_type?: 'image' | 'video' | null;
  signed_url?: string | null;
  thumbnail_signed_url?: string | null;
  width?: number | null;
  height?: number | null;
  image_crops?: Record<string, { scale?: number; x?: number; y?: number }> | null;
};

interface PostMockupModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: MockupAsset[];
  copy: string;
  hashtags: string[];
  channels: string[];
  accounts: SocialAccountSummary[];
  brandName?: string | null;
}

const FORMAT_RATIOS: Record<string, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '1.91:1': 1.91,
  '9:16': 9 / 16,
};

const SUPPORTED_RATIOS = Object.keys(FORMAT_RATIOS);

const META_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '1.91:1': { width: 1080, height: 566 },
  '9:16': { width: 1080, height: 1920 },
};

const CHANNEL_PROVIDER: Record<string, 'facebook' | 'instagram' | 'linkedin'> = {
  facebook: 'facebook',
  instagram_feed: 'instagram',
  instagram_story: 'instagram',
  linkedin_profile: 'linkedin',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function pickIgFeedRatio(originalRatio: string): string {
  if (originalRatio === '9:16') return '4:5';
  if (SUPPORTED_RATIOS.includes(originalRatio) && originalRatio !== '9:16') {
    return originalRatio;
  }
  return '1:1';
}

function targetRatioForChannel(channel: string, asset: MockupAsset): string {
  const assetRatio = asset.aspect_ratio || '1:1';
  switch (channel) {
    case 'instagram_story':
      return '9:16';
    case 'instagram_feed':
      return pickIgFeedRatio(assetRatio);
    case 'facebook':
    case 'linkedin_profile':
    default:
      return SUPPORTED_RATIOS.includes(assetRatio) ? assetRatio : '1:1';
  }
}

function MockupImage({
  asset,
  targetRatio,
}: {
  asset: MockupAsset;
  targetRatio: string;
}) {
  const previewUrl = asset.thumbnail_signed_url || asset.signed_url || null;
  const isVideo = (asset.asset_type ?? 'image') === 'video';

  const frameWidth = FORMAT_RATIOS[targetRatio] ?? 1;
  const frameHeight = 1;

  const imageWidth = asset.width ?? 1080;
  const imageHeight = asset.height ?? 1080;
  const imageRatio = imageWidth / Math.max(imageHeight, 1);

  const minScale = Math.max(frameWidth / imageRatio, frameHeight / 1);

  const storedCrop = asset.image_crops?.[targetRatio];
  const scale = Math.max(storedCrop?.scale ?? minScale, minScale);
  const cropX = storedCrop?.x ?? 0;
  const cropY = storedCrop?.y ?? 0;

  const overflowX = Math.max(0, (imageRatio * scale - frameWidth) / 2);
  const overflowY = Math.max(0, (1 * scale - frameHeight) / 2);

  const translateXPercent = overflowX === 0 ? 0 : (clamp(cropX, -1, 1) * overflowX * 100) / frameWidth;
  const translateYPercent = overflowY === 0 ? 0 : (clamp(cropY, -1, 1) * overflowY * 100) / frameHeight;

  const widthPercent = (imageRatio * scale * 100) / frameWidth;
  const heightPercent = (scale * 100) / frameHeight;

  if (!previewUrl) {
    return (
      <div
        className="relative w-full overflow-hidden bg-gray-100 flex items-center justify-center"
        style={{ aspectRatio: `${frameWidth} / ${frameHeight}` }}
      >
        <span className="text-xs text-gray-400">No preview</span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      style={{ aspectRatio: `${frameWidth} / ${frameHeight}` }}
    >
      <img
        src={previewUrl}
        alt={asset.title || 'Post preview'}
        draggable={false}
        className="absolute top-1/2 left-1/2 max-w-none select-none"
        style={{
          width: `${widthPercent}%`,
          height: `${heightPercent}%`,
          transform: `translate(calc(-50% + ${translateXPercent}%), calc(-50% + ${translateYPercent}%))`,
        }}
      />
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow">
            <svg className="h-5 w-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelTabIcon({ channel }: { channel: string }) {
  if (channel === 'facebook') {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#1877F2] text-white text-[10px] font-bold">
        f
      </span>
    );
  }
  if (channel === 'instagram_feed' || channel === 'instagram_story') {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-[#833AB4] via-[#C13584] to-[#E1306C]">
        <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.07 1.645.07 4.85s-.012 3.584-.07 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.251-.149-4.771-1.699-4.919-4.919-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85c.149-3.227 1.664-4.771 4.919-4.919 1.266-.058 1.644-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072C3.58.238 2.31 1.684 2.163 4.947.105 6.227.092 6.635.092 9.897s.014 3.667.072 4.947c.147 3.264 1.693 4.534 4.947 4.682 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c3.264-.148 4.534-1.693 4.682-4.947.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947C23.762 2.316 22.316.846 19.053.698 17.773.64 17.365.626 14.103.626zM12 5.835a6.165 6.165 0 100 12.33 6.165 6.165 0 000-12.33zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" />
        </svg>
      </span>
    );
  }
  if (channel === 'linkedin_profile') {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#0A66C2] text-white text-[10px] font-bold">
        in
      </span>
    );
  }
  return null;
}

function getAccountForChannel(
  channel: string,
  accounts: SocialAccountSummary[],
): SocialAccountSummary | null {
  const provider = CHANNEL_PROVIDER[channel];
  if (!provider) return null;
  return accounts.find((a) => a.provider === provider && a.status === 'connected') ?? null;
}

function getDisplayName(
  account: SocialAccountSummary | null,
  fallback: string,
): string {
  if (!account) return fallback;
  const meta = account.metadata as Record<string, unknown> | null;
  return (
    (meta?.pageName as string | undefined) ||
    (meta?.username as string | undefined) ||
    (meta?.name as string | undefined) ||
    (account.handle && !/^\d+$/.test(account.handle) ? account.handle : null) ||
    fallback
  );
}

function getProfilePicture(account: SocialAccountSummary | null): string | null {
  if (!account) return null;
  const meta = account.metadata as Record<string, unknown> | null;
  const fbPageId = (meta?.pageId ?? meta?.facebookPageId) as string | undefined;
  if (fbPageId) {
    return `https://graph.facebook.com/v21.0/${fbPageId}/picture?type=small`;
  }
  return (meta?.profilePictureUrl as string | undefined) ?? null;
}

function FacebookMockup({
  assets,
  copy,
  hashtags,
  account,
  brandName,
}: {
  assets: MockupAsset[];
  copy: string;
  hashtags: string[];
  account: SocialAccountSummary | null;
  brandName: string;
}) {
  const displayName = getDisplayName(account, brandName);
  const pic = getProfilePicture(account);
  const fullCaption = [copy, hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')]
    .filter(Boolean)
    .join('\n\n');

  return (
    <div className="mx-auto max-w-md bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {pic ? (
            <img src={pic} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{displayName}</div>
          <div className="text-xs text-gray-500">Just now · 🌐</div>
        </div>
      </div>
      {fullCaption && (
        <div className="px-3 pb-2 text-sm text-gray-900 whitespace-pre-wrap break-words">
          {fullCaption}
        </div>
      )}
      {assets.length > 0 && (
        <div className="bg-black">
          {assets.map((asset) => (
            <MockupImage
              key={asset.id}
              asset={asset}
              targetRatio={targetRatioForChannel('facebook', asset)}
            />
          ))}
        </div>
      )}
      <div className="flex items-center justify-around border-t border-gray-100 py-1.5 text-xs font-medium text-gray-600">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>↗ Share</span>
      </div>
    </div>
  );
}

function InstagramFeedMockup({
  assets,
  copy,
  hashtags,
  account,
  brandName,
}: {
  assets: MockupAsset[];
  copy: string;
  hashtags: string[];
  account: SocialAccountSummary | null;
  brandName: string;
}) {
  const displayName = getDisplayName(account, brandName);
  const pic = getProfilePicture(account);
  const fullCaption = [copy, hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="mx-auto max-w-md bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-[#833AB4] via-[#C13584] to-[#E1306C] p-[2px] flex-shrink-0">
          <div className="h-full w-full rounded-full overflow-hidden bg-white">
            {pic ? (
              <img src={pic} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{displayName}</div>
        </div>
        <span className="text-gray-500">⋯</span>
      </div>
      {assets.length > 0 && (
        <div className="bg-black">
          {assets.map((asset) => (
            <MockupImage
              key={asset.id}
              asset={asset}
              targetRatio={targetRatioForChannel('instagram_feed', asset)}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 px-3 pt-2 text-gray-900 text-lg">
        <span>♡</span>
        <span>💬</span>
        <span>↗</span>
        <span className="ml-auto">🔖</span>
      </div>
      {fullCaption && (
        <div className="px-3 py-2 text-sm text-gray-900 break-words">
          <span className="font-semibold mr-1">{displayName}</span>
          <span className="whitespace-pre-wrap">{fullCaption}</span>
        </div>
      )}
    </div>
  );
}

function InstagramStoryMockup({
  assets,
  account,
  brandName,
}: {
  assets: MockupAsset[];
  account: SocialAccountSummary | null;
  brandName: string;
}) {
  const displayName = getDisplayName(account, brandName);
  const pic = getProfilePicture(account);
  const firstAsset = assets[0];

  return (
    <div className="mx-auto" style={{ maxWidth: '280px' }}>
      <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '9 / 16' }}>
        {firstAsset ? (
          <MockupImage asset={firstAsset} targetRatio="9:16" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-white/60">
            No media
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 p-3">
          <div className="h-0.5 w-full bg-white/40 rounded-full overflow-hidden mb-3">
            <div className="h-full w-1/3 bg-white rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full overflow-hidden bg-white/20 flex-shrink-0 ring-1 ring-white">
              {pic ? (
                <img src={pic} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-sm font-semibold text-white drop-shadow">{displayName}</span>
            <span className="text-xs text-white/80 drop-shadow">now</span>
          </div>
        </div>
      </div>
      {assets.length > 1 && (
        <p className="mt-2 text-center text-xs text-gray-500">
          Stories show one image. {assets.length - 1} additional image{assets.length > 2 ? 's' : ''} not shown.
        </p>
      )}
    </div>
  );
}

const PostMockupModal: React.FC<PostMockupModalProps> = ({
  isOpen,
  onClose,
  assets,
  copy,
  hashtags,
  channels,
  accounts,
  brandName,
}) => {
  const supportedChannels = useMemo(
    () => channels.filter((c) => c in CHANNEL_PROVIDER),
    [channels],
  );

  const [activeChannel, setActiveChannel] = useState<string>(
    supportedChannels[0] ?? 'facebook',
  );

  const safeBrandName = brandName?.trim() || 'Your Page';

  if (!isOpen) return null;

  if (supportedChannels.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Post preview" maxWidth="lg">
        <p className="text-sm text-gray-600">
          No Facebook or Instagram channels are configured for this post, so there&apos;s nothing
          to preview here yet.
        </p>
      </Modal>
    );
  }

  const channelToShow = supportedChannels.includes(activeChannel)
    ? activeChannel
    : supportedChannels[0];

  const account = getAccountForChannel(channelToShow, accounts);
  const targetRatio = assets[0]
    ? targetRatioForChannel(channelToShow, assets[0])
    : '1:1';
  const dims = META_DIMENSIONS[targetRatio];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Post preview"
      subtitle="Approximation of how the post will appear once published."
      maxWidth="lg"
    >
      <div className="flex border-b border-gray-200 -mx-6 px-6 -mt-2 mb-4 overflow-x-auto">
        {supportedChannels.map((channel) => {
          const isActive = channel === channelToShow;
          return (
            <button
              key={channel}
              type="button"
              onClick={() => setActiveChannel(channel)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-[#6366F1] text-[#6366F1]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <ChannelTabIcon channel={channel} />
              {getChannelLabel(channel)}
            </button>
          );
        })}
      </div>

      {dims && assets.length > 0 && (
        <div className="mb-4 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600">
          Image will display at <span className="font-semibold text-gray-900">{targetRatio}</span>{' '}
          ({dims.width}×{dims.height}px) on {getChannelLabel(channelToShow)}.
        </div>
      )}

      {channelToShow === 'facebook' && (
        <FacebookMockup
          assets={assets}
          copy={copy}
          hashtags={hashtags}
          account={account}
          brandName={safeBrandName}
        />
      )}
      {channelToShow === 'instagram_feed' && (
        <InstagramFeedMockup
          assets={assets}
          copy={copy}
          hashtags={hashtags}
          account={account}
          brandName={safeBrandName}
        />
      )}
      {channelToShow === 'instagram_story' && (
        <InstagramStoryMockup
          assets={assets}
          account={account}
          brandName={safeBrandName}
        />
      )}
      {channelToShow === 'linkedin_profile' && (
        <FacebookMockup
          assets={assets}
          copy={copy}
          hashtags={hashtags}
          account={account}
          brandName={safeBrandName}
        />
      )}
    </Modal>
  );
};

export default PostMockupModal;
