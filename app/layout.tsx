import type { Metadata } from 'next';
import './globals.css';
import './profile.css';
import './admin/admin.css';

export const metadata: Metadata = {
  title: 'Kumar Vibhu — Full-Stack Developer',
  description: 'Kumar Vibhu is a Full-Stack Developer building production-ready web applications, data platforms, APIs, automation and scalable user experiences.',
  keywords: ['Kumar Vibhu','Full-Stack Developer','React Developer','Next.js Developer','Node.js Developer','MERN Developer'],
};

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
