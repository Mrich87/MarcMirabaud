import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Accueil', icon: '⛳', end: true },
  { to: '/rounds', label: 'Rounds', icon: '📋' },
  { to: '/courses', label: 'Parcours', icon: '🗺️' },
  { to: '/stats', label: 'Stats', icon: '📊' },
  { to: '/training', label: 'Training', icon: '💪' },
  { to: '/wedges', label: 'Sac', icon: '🎯' },
];

export default function Layout() {
  return (
    <div className="app-shell">
      <Outlet />
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
