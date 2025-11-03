import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { ImportPage } from '@/pages/ImportPage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { PortfolioPage } from '@/pages/PortfolioPage';
import { TaxPage } from '@/pages/Tax';
import { VisualizationPage } from '@/pages/VisualizationPage';
import WheelModern from '@/pages/WheelModern';
import WheelPage from '@/pages/wheel/WheelPage';
import JournalPage from '@/pages/journal/JournalPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/" element={<WheelPage />} />
            <Route path="/wheel" element={<WheelPage />} />
            <Route path="/wheel-legacy" element={<WheelModern />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/visualization" element={<VisualizationPage />} />
            <Route path="/tax" element={<TaxPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
