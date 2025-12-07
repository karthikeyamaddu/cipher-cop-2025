import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import NotificationPopup from './components/NotificationPopup';
import Signup from './logins/Signup.jsx';
import Home from './logins/Home.jsx';
import Login from './logins/Login.jsx';
import Dashboard from './logins/Dashboard.jsx';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <NotificationProvider>
          <NotificationPopup />
          <Routes>
            <Route path="/" element={<Navigate to="/Home" replace />} />
            <Route path="/Signup" element={<Signup />} />
            <Route path="/Login" element={<Login />} />
            <Route path="/Home" element={<Home />} />
            <Route path="/Dashboard" element={<Dashboard />} />
          </Routes>
        </NotificationProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;