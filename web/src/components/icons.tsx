interface IconProps {
  className?: string;
}

export function LightbulbIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
    >
      {/* Bulb top */}
      <rect x="5" y="1" width="6" height="1" />
      <rect x="4" y="2" width="1" height="1" />
      <rect x="11" y="2" width="1" height="1" />
      <rect x="3" y="3" width="1" height="4" />
      <rect x="12" y="3" width="1" height="4" />
      {/* Bulb bottom narrows */}
      <rect x="4" y="7" width="1" height="1" />
      <rect x="11" y="7" width="1" height="1" />
      <rect x="5" y="8" width="1" height="1" />
      <rect x="10" y="8" width="1" height="1" />
      {/* Filament glow */}
      <rect x="6" y="4" width="1" height="3" />
      <rect x="9" y="4" width="1" height="3" />
      <rect x="7" y="6" width="2" height="1" />
      {/* Base */}
      <rect x="6" y="9" width="4" height="1" />
      <rect x="5" y="10" width="6" height="1" />
      <rect x="6" y="11" width="4" height="1" />
      <rect x="5" y="12" width="6" height="1" />
      {/* Screw base */}
      <rect x="6" y="13" width="4" height="1" />
      <rect x="7" y="14" width="2" height="1" />
    </svg>
  );
}

export function GamepadIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect x="2" y="4" width="12" height="1" />
      <rect x="1" y="5" width="14" height="6" />
      <rect x="2" y="11" width="3" height="2" />
      <rect x="11" y="11" width="3" height="2" />
      {/* D-pad */}
      <rect x="4" y="7" width="3" height="1" className="fill-background" />
      <rect x="5" y="6" width="1" height="3" className="fill-background" />
      {/* Buttons */}
      <rect x="10" y="6" width="1" height="1" className="fill-background" />
      <rect x="12" y="7" width="1" height="1" className="fill-background" />
    </svg>
  );
}

export function MusicNoteIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
    >
      {/* Beam */}
      <rect x="5" y="2" width="8" height="2" />
      {/* Stems */}
      <rect x="5" y="4" width="1" height="8" />
      <rect x="12" y="4" width="1" height="6" />
      {/* Left note head */}
      <rect x="3" y="11" width="3" height="2" />
      <rect x="2" y="12" width="1" height="1" />
      {/* Right note head */}
      <rect x="10" y="9" width="3" height="2" />
      <rect x="9" y="10" width="1" height="1" />
    </svg>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
    >
      {/* Gear teeth (top, right, bottom, left + diagonals) */}
      <rect x="6" y="1" width="4" height="2" />
      <rect x="6" y="13" width="4" height="2" />
      <rect x="1" y="6" width="2" height="4" />
      <rect x="13" y="6" width="2" height="4" />
      {/* Diagonal teeth */}
      <rect x="2" y="2" width="3" height="2" />
      <rect x="11" y="2" width="3" height="2" />
      <rect x="2" y="12" width="3" height="2" />
      <rect x="11" y="12" width="3" height="2" />
      {/* Body ring */}
      <rect x="4" y="3" width="8" height="1" />
      <rect x="3" y="4" width="10" height="8" />
      <rect x="4" y="12" width="8" height="1" />
      {/* Center hole */}
      <rect x="6" y="6" width="4" height="4" className="fill-background" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect x="2" y="2" width="2" height="2" />
      <rect x="4" y="4" width="2" height="2" />
      <rect x="6" y="6" width="4" height="4" />
      <rect x="10" y="4" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="4" y="10" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="10" y="10" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
    </svg>
  );
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
    >
      {/* Clock circle */}
      <rect x="5" y="1" width="6" height="1" />
      <rect x="3" y="2" width="2" height="1" />
      <rect x="11" y="2" width="2" height="1" />
      <rect x="2" y="3" width="1" height="2" />
      <rect x="13" y="3" width="1" height="2" />
      <rect x="1" y="5" width="1" height="4" />
      <rect x="14" y="5" width="1" height="4" />
      <rect x="2" y="9" width="1" height="2" />
      <rect x="13" y="9" width="1" height="2" />
      <rect x="3" y="11" width="2" height="1" />
      <rect x="11" y="11" width="2" height="1" />
      <rect x="5" y="12" width="6" height="1" />
      {/* Clock hands */}
      <rect x="7" y="4" width="2" height="4" />
      <rect x="9" y="7" width="2" height="2" />
      {/* Arrow (rewind indicator) */}
      <rect x="1" y="1" width="1" height="4" />
      <rect x="1" y="1" width="3" height="1" />
    </svg>
  );
}

export function PaletteIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect x="1" y="1" width="6" height="6" fill="#ef4444" />
      <rect x="9" y="1" width="6" height="6" fill="#3b82f6" />
      <rect x="1" y="9" width="6" height="6" fill="#22c55e" />
      <rect x="9" y="9" width="6" height="6" fill="#eab308" />
    </svg>
  );
}

export function PixelChevron({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="14"
      viewBox="0 0 5 7"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect x="0" y="0" width="2" height="1" />
      <rect x="1" y="1" width="2" height="1" />
      <rect x="2" y="2" width="2" height="1" />
      <rect x="3" y="3" width="2" height="1" />
      <rect x="2" y="4" width="2" height="1" />
      <rect x="1" y="5" width="2" height="1" />
      <rect x="0" y="6" width="2" height="1" />
    </svg>
  );
}

export function MonitorIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
    >
      <rect x="2" y="2" width="12" height="8" />
      <rect x="3" y="3" width="10" height="6" className="fill-primary/20" />
      <rect x="6" y="11" width="4" height="2" />
      <rect x="4" y="13" width="8" height="1" />
    </svg>
  );
}

export function ControllerIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
    >
      <rect x="2" y="6" width="2" height="4" />
      <rect x="4" y="4" width="8" height="8" />
      <rect x="12" y="6" width="2" height="4" />
      <rect x="3" y="3" width="4" height="1" />
      <rect x="9" y="3" width="4" height="1" />
      <rect x="3" y="12" width="3" height="2" />
      <rect x="10" y="12" width="3" height="2" />
      <rect x="10" y="6" width="2" height="2" className="fill-primary/30" />
      <rect x="5" y="6" width="2" height="2" className="fill-primary/30" />
    </svg>
  );
}
