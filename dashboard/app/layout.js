export const metadata = {
  title: 'Lead System Admin',
  description: 'Admin dashboard for lead intake and dispatch',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={bodyStyle}>{children}</body>
    </html>
  );
}

const bodyStyle = {
  margin: 0,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  backgroundColor: '#f5f5f5',
  color: '#111',
};
