import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import DrawPage from './pages/DrawPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ManagePage from './pages/ManagePage';

function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} end>
          🎰 抽人发言
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'active' : ''}>
          🏆 排行榜
        </NavLink>
        <NavLink to="/manage" className={({ isActive }) => isActive ? 'active' : ''}>
          👥 管理
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<DrawPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/manage" element={<ManagePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
