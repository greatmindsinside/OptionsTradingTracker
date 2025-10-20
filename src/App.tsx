import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HomePage } from '@/pages/HomePage';
import { ImportPage } from '@/pages/ImportPage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { PortfolioPage } from '@/pages/PortfolioPage';
import { TaxPage } from '@/pages/TaxPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="app">
          <header className="app-header">
            <nav className="app-nav">
              <h1>Options Tracker</h1>
              <div className="nav-links">
                <a href="/">Dashboard</a>
                <a href="/import">Import</a>
                <a href="/analysis">Analysis</a>
                <a href="/portfolio">Portfolio</a>
                <a href="/tax">Tax</a>
              </div>
            </nav>
          </header>

          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/analysis" element={<AnalysisPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/tax" element={<TaxPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
