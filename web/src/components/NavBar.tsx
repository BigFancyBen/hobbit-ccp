import { useLocation, Link } from 'wouter';

const TABS = [
  { label: 'Lights', href: '/' },
  { label: 'Games', href: '/games' },
] as const;

export function NavBar() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === '/') return location === '/' || location === '/lights';
    return location === href;
  };

  return (
    <nav className="flex gap-2 flex-1">
      {TABS.map(({ label, href }) => (
        <Link key={href} href={href} className="flex-1">
          <button
            className={`w-full h-12 text-sm retro touch-manipulation transition-colors ${
              isActive(href)
                ? 'bg-accent text-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {label}
          </button>
        </Link>
      ))}
    </nav>
  );
}
