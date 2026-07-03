import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Home from './pages/Home';
import CourseList from './pages/courses/CourseList';
import CourseEdit from './pages/courses/CourseEdit';
import CoursePrint from './pages/courses/CoursePrint';
import RoundList from './pages/rounds/RoundList';
import RoundEntry from './pages/rounds/RoundEntry';
import RoundDetail from './pages/rounds/RoundDetail';
import Stats from './pages/stats/Stats';
import Wedges from './pages/wedges/Wedges';
import Training from './pages/training/Training';
import Settings from './pages/Settings';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="courses" element={<CourseList />} />
          <Route path="courses/new" element={<CourseEdit />} />
          <Route path="courses/:id" element={<CourseEdit />} />
          <Route path="courses/:id/print" element={<CoursePrint />} />
          <Route path="rounds" element={<RoundList />} />
          <Route path="rounds/new" element={<RoundEntry />} />
          <Route path="rounds/:id" element={<RoundEntry />} />
          <Route path="rounds/:id/view" element={<RoundDetail />} />
          <Route path="stats" element={<Stats />} />
          <Route path="wedges" element={<Wedges />} />
          <Route path="training" element={<Training />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
