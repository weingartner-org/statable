# Statable ohne Netz - kleiner Server für Windows (nur Bordmittel von Windows PowerShell 5.1 und PowerShell 7).
# Liefert den Ordner "statable" an den Browser dieses Rechners (nur localhost, von außen nicht erreichbar) und öffnet ihn.
# Fenster schließen oder Strg+C beendet Statable.
$ErrorActionPreference = 'Stop'
$wurzel = [System.IO.Path]::GetFullPath((Join-Path (Join-Path $PSScriptRoot '..') 'statable'))
if (-not (Test-Path (Join-Path $wurzel 'index.html'))) { Write-Host 'Ordner statable fehlt neben dem Ordner start.'; Read-Host 'Enter beendet'; exit 1 }
$typ = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.json'='application/json'; '.wasm'='application/wasm'; '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.ico'='image/x-icon';
  '.webmanifest'='application/manifest+json'; '.csv'='text/csv; charset=utf-8'; '.txt'='text/plain; charset=utf-8'; '.pdf'='application/pdf'; '.ttf'='font/ttf'; '.woff2'='font/woff2'; '.zip'='application/zip' }

# Fester Port: Projekte liegen im Browser je Adresse - mit demselben Port findet der Browser sie beim nächsten Start wieder.
$ports = 47815..47824; $listener = $null; $port = 0
foreach ($p in $ports) {
  try { $l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$p/"); $l.Start(); $listener = $l; $port = $p; break } catch { }
  # Port belegt: läuft dort schon Statable? Dann nur den Browser öffnen.
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Method Head -Uri "http://localhost:$p/index.html" -TimeoutSec 2
    if ($r.Headers['X-Statable'] -eq 'offline') { Start-Process "http://localhost:$p/"; Write-Host "Statable läuft schon: http://localhost:$p/"; exit 0 }
  } catch { }
}
if (-not $listener) { Write-Host "Kein freier Port zwischen $($ports[0]) und $($ports[-1])."; Read-Host 'Enter beendet'; exit 1 }
$url = "http://localhost:$port/"
Write-Host ''
Write-Host "Statable läuft ohne Netz: $url"
if ($port -ne $ports[0]) { Write-Host "Hinweis: anderer Port als sonst ($($ports[0])) - früher hier gespeicherte Projekte sind unter dieser Adresse nicht zu sehen." }
Write-Host 'Dieses Fenster offen lassen. Schließen oder Strg+C beendet Statable.'
Write-Host ''
Start-Process $url

while ($listener.IsListening) {
  $ctx = $listener.GetContext(); $antwort = $ctx.Response
  try {
    $antwort.Headers.Add('X-Statable', 'offline'); $antwort.Headers.Add('X-Content-Type-Options', 'nosniff'); $antwort.Headers.Add('Cache-Control', 'no-cache')
    $pfad = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($pfad -eq '/') { $pfad = '/index.html' }
    $datei = [System.IO.Path]::GetFullPath((Join-Path $wurzel ($pfad.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar))))
    if (-not $datei.StartsWith($wurzel + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { $antwort.StatusCode = 403 }
    elseif (-not (Test-Path -LiteralPath $datei -PathType Leaf)) { $antwort.StatusCode = 404 }
    else {
      $endung = [System.IO.Path]::GetExtension($datei).ToLowerInvariant()
      $antwort.ContentType = if ($typ.ContainsKey($endung)) { $typ[$endung] } else { 'application/octet-stream' }
      $fs = [System.IO.File]::OpenRead($datei)
      try { $antwort.ContentLength64 = $fs.Length; if ($ctx.Request.HttpMethod -ne 'HEAD') { $fs.CopyTo($antwort.OutputStream) } } finally { $fs.Dispose() }
    }
  } catch { } finally { try { $antwort.Close() } catch { } }
}
