const STORAGE_KEY = 'marketplace_token_banner_dismissed';
const REMIND_LATER_DAYS = 3;

export const getTokenBannerStatus = (): 'show' | 'dismissed' | 'remind-later' => {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) return 'show';
  if (stored === 'never') return 'dismissed';

  // 检查"稍后提醒"是否过期
  const timestamp = parseInt(stored, 10);
  const now = Date.now();
  const threeDaysInMs = REMIND_LATER_DAYS * 24 * 60 * 60 * 1000;

  if (now - timestamp > threeDaysInMs) {
    return 'show';
  }

  return 'remind-later';
};

export const setTokenBannerDismissed = (type: 'never' | 'later') => {
  if (type === 'never') {
    localStorage.setItem(STORAGE_KEY, 'never');
  } else {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }
};

export const resetTokenBanner = () => {
  localStorage.removeItem(STORAGE_KEY);
};
