import { createRoot } from 'react-dom/client';
import '@compass/ui/fonts';
import '@app/main.css';
import { Showcase } from './Showcase';

createRoot(document.getElementById('root')!).render(<Showcase />);
