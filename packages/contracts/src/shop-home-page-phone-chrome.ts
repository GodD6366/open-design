export const SHOP_HOME_PAGE_PHONE_CHROME = {
  deviceWidth: 390,
  deviceHeight: 844,
  statusBarPaddingTop: 18,
  statusBarPaddingX: 26,
  statusBarFontSize: 15,
  statusBarLineHeight: 18,
  statusBarGap: 6,
  capsuleOffsetTop: 40,
  capsulePaddingX: 18,
  homeIndicatorHeight: 28,
  homeIndicatorWidth: 134,
  homeIndicatorBottom: 8,
};

export const SHOP_HOME_PAGE_STATUS_SIGNAL_BARS = [
  { x: 1, y: 9.5, width: 3, height: 2.5, rx: 1.4, opacity: 0.45 },
  { x: 5, y: 7, width: 3, height: 5, rx: 1.4, opacity: 0.61 },
  { x: 9, y: 4.5, width: 3, height: 7.5, rx: 1.4, opacity: 0.77 },
  { x: 13, y: 2, width: 3, height: 10, rx: 1.4, opacity: 0.93 },
];

export const SHOP_HOME_PAGE_STATUS_WIFI_PATHS = [
  { d: 'M1.7 4.8C3.6 3 6.2 2 9 2c2.8 0 5.4 1 7.3 2.8', type: 'path' },
  { d: 'M4.4 7.5A6.6 6.6 0 0 1 9 5.8c1.8 0 3.4.6 4.6 1.7', type: 'path' },
  { d: 'M7.1 10.2A2.9 2.9 0 0 1 9 9.5c.7 0 1.4.3 1.9.7', type: 'path' },
  { cx: 9, cy: 12, r: 1.25, type: 'circle' },
];

export const SHOP_HOME_PAGE_STATUS_BATTERY = {
  viewBox: '0 0 25 11',
  outline: { x: 0.5, y: 0.5, width: 21, height: 10, rx: 2.5, strokeOpacity: 0.45 },
  nub: { x: 22, y: 3.5, width: 1.5, height: 4, rx: 0.4, fillOpacity: 0.45 },
  fill: { x: 2, y: 2, width: 18, height: 7, rx: 1.4 },
};
