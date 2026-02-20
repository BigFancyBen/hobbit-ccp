import { useLocation, Link } from 'wouter';
import { LightbulbIcon, GamepadIcon, MusicNoteIcon } from '@/components/icons';

const TABS = [
  { icon: LightbulbIcon, href: '/', label: 'Lights' },
  { icon: GamepadIcon, href: '/games', label: 'Games' },
  { icon: MusicNoteIcon, href: '/tunes', label: 'Tunes' },
] as const;

export function NavBar() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === '/') return location === '/' || location === '/lights';
    return location === href;
  };

  return (
    <nav className="flex gap-1">
      {TABS.map(({ icon: Icon, href, label }) => (
        <Link key={href} href={href}>
          <button
            aria-label={label}
            className={`h-10 w-10 flex items-center justify-center touch-manipulation transition-colors ${
              isActive(href)
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            <Icon />
          </button>
        </Link>
      ))}
    </nav>
  );
}
