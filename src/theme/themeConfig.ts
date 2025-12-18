import type { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    fontSize: 14,
    colorPrimary: '#0D9488', // Teal-600
    colorSuccess: '#10B981', // Emerald-500
    colorWarning: '#F59E0B', // Amber-500
    colorError: '#EF4444', // Red-500
    colorInfo: '#0D9488',

    // Clean Typography
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    colorText: '#0F172A', // Slate-900
    colorTextSecondary: '#64748B', // Slate-500

    // Clean Shapes
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    wireframe: false,
  },
  components: {
    Button: {
      fontWeight: 500,
      controlHeight: 40,
      borderRadius: 8,
    },
    Card: {
      borderRadius: 12,
      paddingLG: 24,
      colorBgContainer: '#FFFFFF',
    },
    Input: {
      controlHeight: 40,
      borderRadius: 8,
    },
    Layout: {
      bodyBg: '#F8FAFC',
      headerBg: '#FFFFFF',
      siderBg: '#FFFFFF',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#F1F5F9', // Slate-100
      itemSelectedColor: '#0D9488',
      itemHoverBg: '#F8FAFC',
      itemBorderRadius: 8,
      itemMarginInline: 8,
      iconSize: 18,
    },
    Table: {
      headerBg: '#F8FAFC',
      borderRadius: 12,
    },
  },
};

export default theme;
