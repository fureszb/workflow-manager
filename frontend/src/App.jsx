import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './store/ThemeContext';
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Processes from './pages/Processes';
import Emails from './pages/Emails';
import Documents from './pages/Documents';
import Chat from './pages/Chat';
import Ideas from './pages/Ideas';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog';
import Scripts from './pages/Scripts';
import TokenMonitor from './pages/TokenMonitor';
import Knowledge from './pages/Knowledge';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="processes" element={<Processes />} />
            <Route path="emails" element={<Emails />} />
            <Route path="documents" element={<Documents />} />
            <Route path="chat" element={<Chat />} />
            <Route path="ideas" element={<Ideas />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="scripts" element={<Scripts />} />
            <Route path="token-monitor" element={<TokenMonitor />} />
            <Route path="knowledge" element={<Knowledge />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
