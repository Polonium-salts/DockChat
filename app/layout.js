import { Inter } from 'next/font/google';
import './globals.css';
import { getServerSession } from 'next-auth';
import SessionProvider from './components/SessionProvider';
import LanguageProvider from './components/LanguageProvider';
import { authOptions } from './auth/config';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'DockChat - Chat & RSS Platform',
  description: 'A modern chat platform with RSS integration',
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" data-theme="light">
      <body className={inter.className}>
        <SessionProvider session={session}>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
