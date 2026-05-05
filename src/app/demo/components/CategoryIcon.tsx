import {
  Music,
  Beef,
  Umbrella,
  Target,
  Coffee,
  Sparkles,
  Calendar,
  Gift,
  Star,
  Heart,
  type LucideIcon,
} from 'lucide-react'
import type { IconColor, IconName } from '../data/types'

const ICON_MAP: Record<IconName, LucideIcon> = {
  music: Music,
  burger: Beef,
  umbrella: Umbrella,
  target: Target,
  coffee: Coffee,
  sparkle: Sparkles,
  calendar: Calendar,
  gift: Gift,
  star: Star,
  heart: Heart,
}

const COLOR_MAP: Record<IconColor, { bg: string; fg: string }> = {
  yellow: { bg: 'bg-amber-100', fg: 'text-amber-600' },
  pink: { bg: 'bg-pink-100', fg: 'text-pink-600' },
  indigo: { bg: 'bg-indigo-100', fg: 'text-indigo-600' },
  green: { bg: 'bg-emerald-100', fg: 'text-emerald-600' },
  red: { bg: 'bg-red-100', fg: 'text-red-600' },
  blue: { bg: 'bg-blue-100', fg: 'text-blue-600' },
}

type Props = {
  name: IconName
  color: IconColor
  size?: 'sm' | 'md' | 'lg'
}

export default function CategoryIcon({ name, color, size = 'md' }: Props) {
  const Icon = ICON_MAP[name] ?? Sparkles
  const palette = COLOR_MAP[color] ?? COLOR_MAP.indigo

  const tile =
    size === 'lg'
      ? 'w-14 h-14 rounded-xl'
      : size === 'sm'
      ? 'w-9 h-9 rounded-lg'
      : 'w-12 h-12 rounded-xl'

  const icon = size === 'lg' ? 'w-7 h-7' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'

  return (
    <div className={`${tile} ${palette.bg} ${palette.fg} flex items-center justify-center shrink-0`}>
      <Icon className={icon} strokeWidth={2} />
    </div>
  )
}
