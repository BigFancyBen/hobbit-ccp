import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@hobbit/ui/8bit/card';

const API = '/api/control';

export function WifiPage() {
  const [wifi, setWifi] = useState<{ ssid: string; password: string } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API}/wifi`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setWifi)
      .catch(() => setError(true));
  }, []);

  // Escape special chars per Wi-Fi QR spec
  const escapeWifi = (s: string) => s.replace(/([\\;,":])/, '\\$1');
  const qrValue = wifi
    ? `WIFI:S:${escapeWifi(wifi.ssid)};T:WPA;P:${escapeWifi(wifi.password)};;`
    : '';

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm mx-2">
        <Card>
          <CardContent className="flex flex-col items-center gap-5 py-6">
            {error ? (
              <p className="text-destructive text-xs text-center">
                Wi-Fi not configured
              </p>
            ) : !wifi ? (
              <p className="text-muted-foreground text-xs text-center animate-pulse">
                Loading...
              </p>
            ) : (
              <>
                <h1 className="text-sm text-center text-foreground">
                  {wifi.ssid}
                </h1>

                <div className="bg-white p-3 rounded">
                  <QRCodeSVG
                    value={qrValue}
                    size={200}
                    level="M"
                  />
                </div>

                <p className="text-muted-foreground text-[10px] text-center leading-relaxed">
                  Scan with your camera<br />to join the network
                </p>

                <div className="text-center">
                  <p className="text-muted-foreground text-[10px] mb-1">Password</p>
                  <p className="text-foreground text-xs select-all">{wifi.password}</p>
                </div>


              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-4">
          <a href="/" className="text-muted-foreground text-[10px] retro hover:text-foreground">
            &larr; Back
          </a>
        </div>
      </div>
    </div>
  );
}
