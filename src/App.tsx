import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import WheelPage from '@/pages/wheel/WheelPage';
import JournalPage from '@/pages/journal/JournalPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import InputDemoPage from '@/pages/dev/InputDemoPage';
import { AppLayout } from '@/components/layout/AppLayout';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<WheelPage />} />
              <Route path="/wheel" element={<WheelPage />} />
              <Route path="/journal" element={<JournalPage />} />
              {/* Dev-only demo route for reviewing input styles in a modal */}
              <Route path="/dev/input-demo" element={<InputDemoPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
