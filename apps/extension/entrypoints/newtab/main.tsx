import { createRoot } from 'react-dom/client';
import '@compass/ui/fonts';
import '@app/main.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
