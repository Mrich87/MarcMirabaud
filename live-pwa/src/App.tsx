import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import GameCreate from './pages/GameCreate';
import GameView from './pages/GameView';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<GameCreate />} />
        <Route path="/game/:code" element={<GameView />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
