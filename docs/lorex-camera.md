# Lorex SL300 Camera — ONVIF Control Reference

**Camera**: Lorex SL300 (Dahua OEM), firmware 1.000.9110006.1.R
**IP**: 192.168.0.105, ports 80 (ONVIF HTTP) and 554 (RTSP)
**Auth**: HTTP Digest (`qop=auth`), username `admin`
**Video source token**: `VideoSource000`, profile: `Profile000`

## ONVIF Endpoints

All endpoints are at `http://192.168.0.105/onvif/<service>`:

| Service | Path | Purpose |
|---------|------|---------|
| Device | `device_service` | Device info, capabilities |
| Media | `media_service` | Profiles, encoding, OSD |
| Media2 | `media2_service` | ONVIF 2.0 media |
| Imaging | `imaging_service` | Brightness, contrast, etc. |
| PTZ | `ptz_service` | Pan/tilt/zoom, presets |
| Events | `events_service` | Motion event subscriptions |
| DeviceIO | `deviceio_service` | Audio I/O config |
| Analytics | `analytics_service` | Motion detection zones |

## Authentication

All requests use HTTP Digest auth. Send an unauthenticated POST first to get the `WWW-Authenticate` challenge (realm, nonce, qop), then resend with the computed digest. Content-Type must be `application/soap+xml`.

## Controllable Features

### 1. Image Settings (Imaging Service)

| Setting | Default | Range |
|---------|---------|-------|
| Brightness | 50 | 0-100 |
| Color Saturation | 50 | 0-100 |
| Contrast | 50 | 0-100 |
| Sharpness | 50 | 0-100 |

**Get current settings:**
```xml
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:timg="http://www.onvif.org/ver20/imaging/wsdl">
  <s:Body>
    <timg:GetImagingSettings>
      <timg:VideoSourceToken>VideoSource000</timg:VideoSourceToken>
    </timg:GetImagingSettings>
  </s:Body>
</s:Envelope>
```

**Set a value** (only include the settings you want to change):
```xml
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:timg="http://www.onvif.org/ver20/imaging/wsdl"
            xmlns:tt="http://www.onvif.org/ver10/schema">
  <s:Body>
    <timg:SetImagingSettings>
      <timg:VideoSourceToken>VideoSource000</timg:VideoSourceToken>
      <timg:ImagingSettings>
        <tt:Brightness>50</tt:Brightness>
      </timg:ImagingSettings>
    </timg:SetImagingSettings>
  </s:Body>
</s:Envelope>
```

### 2. Pan/Tilt/Zoom (PTZ Service)

| Axis | Range | Notes |
|------|-------|-------|
| Pan | -1.0 to 1.0 | Left/right |
| Tilt | -1.0 to 1.0 | Up/down |
| Zoom | 0.0 to 1.0 | Digital zoom |

Movement modes: Absolute, Relative, Continuous.

**Saved presets:**
- `1` — "approach"
- `2` — "knocking"

Can save, recall, and remove presets via `SetPreset`, `GotoPreset`, `RemovePreset`.

### 3. Video Encoding (Media Service)

| Parameter | Options |
|-----------|---------|
| Resolution | 2560x1440, 1920x1080, 1280x720 |
| Codec | H.264 (Baseline/Main/High), H.265 on RTSP |
| Frame rate | 1-15 fps |
| Quality | 1-6 |
| GOP length | 15-150 |

### 4. On-Screen Display (Media Service — OSD)

- Date/time overlay: bottom-right, format `yyyy-MM-dd hh:mm:ss tt`
- Channel name: "Camera", top-right
- Can modify text, position, and date format

### 5. Audio (DeviceIO Service)

- 1 audio input (microphone)
- 1 audio output (speaker) — can play audio through camera
- G.711 PCMA codec, 8kHz, 32kbps

### 6. Motion Detection (Analytics Service)

- Cell-based detection on a 22x18 grid
- Sensitivity: 0-100 (default 50 on main zone)
- Multiple detection zones supported

### 7. Events (Events Service)

- Motion event subscriptions via pull-point
- Up to 10 notification producers, 5 pull points

## NOT Controllable via ONVIF

**Physical spotlight/LED** — The white LED spotlight cannot be toggled on/off programmatically. The Dahua RPC2 JSON API on port 80 (`/RPC2_Login`, `/RPC2`) allows reading the light config (`configManager.getConfig` Lighting_V2) and changing the mode (Manual/Auto/Off), but `configManager.setConfig` only changes the *behavior mode* — it does not physically toggle the LED. The `CoaxialControlIO.control` method exists but returns "Unknown error" for all parameter formats. The `/cgi-bin/` CGI endpoints are not available (404). The spotlight requires the Lorex Home app (cloud-based).

## RTSP Stream URLs

```
rtsp://admin:<password>@192.168.0.105:554/cam/realmonitor?channel=1&subtype=0  # Main stream
rtsp://admin:<password>@192.168.0.105:554/cam/realmonitor?channel=1&subtype=1  # Sub stream
```

## Quick Reference: curl Example

```bash
curl -s --max-time 5 -X POST "http://192.168.0.105/onvif/imaging_service" \
  --digest -u 'admin:<password>' \
  -H "Content-Type: application/soap+xml" \
  -d '<SOAP envelope here>'
```
