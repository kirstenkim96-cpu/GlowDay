// src/constants/theme.ts
// GlowDay 디자인 시스템 - 기획서 6장 기반

// ─── 컬러 팔레트 ─────────────────────────────────────────
export const Colors = {
  // Primary
  primary: '#D4537E',       // Glow Pink - CTA, 스트릭, 주요 강조
  primaryLight: '#FBEAF0',  // Primary 배경용
  primaryDark: '#B8406A',   // Primary 눌림 상태

  // Secondary
  secondary: '#1D9E75',     // Soft Teal - 완료 상태, 성공
  secondaryLight: '#E8F7F1',

  // Background & Surface
  background: '#FDFCFB',    // Warm White - 화면 배경
  surface: '#FBEAF0',       // Petal - 카드, 섹션 배경
  card: '#FFFFFF',

  // Text
  text: '#2C2C2A',          // Charcoal - 제목, 주요 텍스트
  textSecondary: '#888780',  // Dust - 부제목, 메타 정보
  textLight: '#C0BDB8',     // 비활성 텍스트

  // Accent
  accent: '#EF9F27',        // Amber - 영양제, 경고
  accentLight: '#FFF5E6',

  // Streak
  streak: '#FF6B35',

  // Status
  danger: '#E8789A',
  success: '#1D9E75',

  // Border
  border: '#F0EEEB',
  borderLight: '#F5F3F0',

  // Dark Mode (v2에서 사용)
  darkBg: '#1A1A1E',
  darkSurface: '#2A2A2E',
  darkCard: '#333338',
} as const;

// ─── 카테고리 ────────────────────────────────────────────
export const Categories = {
  skincare: { label: '스킨케어', color: '#D4537E', icon: '💧', emoji: 'water' },
  supplement: { label: '영양제', color: '#EF9F27', icon: '💊', emoji: 'pill' },
  haircare: { label: '헤어케어', color: '#8B5CF6', icon: '✨', emoji: 'sparkles' },
  bodycare: { label: '바디케어', color: '#1D9E75', icon: '🧴', emoji: 'lotion' },
  salon: { label: '살롱 예약', color: '#F472B6', icon: '💇‍♀️', emoji: 'cut' },
  clinic: { label: '피부과', color: '#06B6D4', icon: '🏥', emoji: 'hospital' },
  other: { label: '기타', color: '#94A3B8', icon: '🌸', emoji: 'blossom' },
} as const;

export type CategoryKey = keyof typeof Categories;

// ─── 타이포그래피 ────────────────────────────────────────
export const Typography = {
  // 한글: Noto Sans KR, 영문/숫자: DM Sans
  // Expo에서는 커스텀 폰트 로딩 필요 (Phase 7에서 적용)
  // 우선 시스템 폰트로 시작

  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.text,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  small: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
} as const;

// ─── 간격 & 크기 ────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

// ─── 그림자 (iOS / Android) ─────────────────────────────
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;

// ─── 스트릭 마일스톤 ────────────────────────────────────
export const StreakMilestones = [
  { days: 7, emoji: '🌟', label: '7일 연속', color: '#EF9F27' },
  { days: 30, emoji: '💎', label: '30일 연속', color: '#3B82F6' },
  { days: 100, emoji: '👑', label: '100일 연속', color: '#D4537E' },
] as const;

// ─── 탭 바 설정 ─────────────────────────────────────────
export const TabConfig = {
  height: 85,
  iconSize: 24,
  labelSize: 10,
  fabSize: 56,
} as const;
