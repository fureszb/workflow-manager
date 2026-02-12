import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './store/ThemeContext';
import { WebSocketProvider } from './store/WebSocketContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Processes from './pages/Processes';
import ProcessArchive from './pages/ProcessArchive';
import TaskDetail from './pages/TaskDetail';
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
      <WebSocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="processes" element={<Processes />} />
              <Route path="processes/archive" element={<ProcessArchive />} />
              <Route path="processes/:processId/tasks/:taskId" element={<TaskDetail />} />
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
        </BrowserRouter>
      </WebSocketProvider>
    </ThemeProvider>
  );
}

export default App;
