export const siteConfig = {
  lang: 'zh-CN',
  title: "Curtis's Blog",
  description: 'A clean and lightweight static blog',
  menuLabel: '菜单',
  archiveTitle: '归档',
  nav: [
    { label: '生活', href: '/life/' },
    { label: '技术', href: '/tech/' },
    { label: '标签', href: '/tags/' },
    { label: '关于', href: '/about/' }
  ],
  sections: {
    life: {
      title: '生活',
      href: '/life/',
      dirs: ['daily']
    },
    tech: {
      title: '技术',
      href: '/tech/',
      dirs: ['tech']
    }
  },
  content: {
    aboutPage: 'about'
  },
  profileLinks: [
    {
      label: 'Buy me a coffee',
      href: 'https://buymeacoffee.com/curtisyan'
    },
    {
      label: 'GitHub',
      href: 'https://github.com/CurtisYan'
    }
  ],
  footer: {
    credit: {
      label: 'Theme by Anders Norén',
      href: 'https://andersnoren.se'
    }
  }
} as const;

export type SiteSection = keyof typeof siteConfig.sections;
