import { ThemeProvider } from '@compass/ui';

export function App() {
  return (
    <ThemeProvider accent="amber">
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: '#888',
          background: '#0e0c0a',
        }}
      >
        Compass shell rebuilding…
      </main>
    </ThemeProvider>
  );
}
