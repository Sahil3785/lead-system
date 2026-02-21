import './globals.css';

export const metadata = {
  title: 'LeadFlow – Lead System Admin',
  description: 'Admin dashboard for lead intake and dispatch',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
