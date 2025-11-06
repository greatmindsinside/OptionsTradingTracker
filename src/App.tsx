import './App.css';

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppLayout } from '@/components/layout/AppLayout';
import InputDemoPage from '@/pages/dev/InputDemoPage';
import JournalPage from '@/pages/journal/JournalPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import WheelPage from '@/pages/wheel/WheelPage';

function App() {
  return (
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
  );
}

export default App;
