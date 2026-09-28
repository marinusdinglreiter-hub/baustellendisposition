<#
    Kleiner lokaler Webserver fuer die Baustellendisposition.

    Warum ueberhaupt ein Server: die Tafel legt die abgelegten PDF-Plaene in
    IndexedDB ab, und Chrome sperrt IndexedDB auf file://-Adressen. Ein
    Doppelklick auf index.html wuerde also eine Tafel zeigen, auf der sich
    keine Plaene ablegen lassen.

    Warum TcpListener und nicht HttpListener: HttpListener verlangt unter
    Windows je nach Konfiguration eine URL-Reservierung per netsh und damit
    Administratorrechte. Ein roher TcpListener auf 127.0.0.1 braucht das nicht
    und laeuft auch auf einem gesperrten Firmenrechner.

    Es wird ausschliesslich an 127.0.0.1 gebunden – aus dem Netz ist der
    Server nicht erreichbar.
#>

param(
    [int]$Port = 5174,
    [string]$Root = (Join-Path $PSScriptRoot '..\dist'),
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$Root = [System.IO.Path]::GetFullPath($Root)

if (-not (Test-Path $Root)) {
    Write-Host ''
    Write-Host '  Der Ordner "dist" fehlt.' -ForegroundColor Red
    Write-Host '  Das Paket ist unvollstaendig - bitte noch einmal kopieren lassen.' -ForegroundColor Red
    Write-Host ''
    Read-Host '  Zum Schliessen Eingabetaste druecken'
    exit 1
}

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.mjs'  = 'text/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
    '.ttf'  = 'font/ttf'
    '.pdf'  = 'application/pdf'
    '.map'  = 'application/json; charset=utf-8'
}

# Freien Port suchen, falls der gewuenschte belegt ist
$listener = $null
for ($p = $Port; $p -lt ($Port + 20); $p++) {
    try {
        $candidate = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
        $candidate.Start()
        $listener = $candidate
        $Port = $p
        break
    } catch {
        # Port belegt, naechsten versuchen
    }
}

if ($null -eq $listener) {
    Write-Host ''
    Write-Host "  Kein freier Port zwischen $Port und $($Port + 19) gefunden." -ForegroundColor Red
    Read-Host '  Zum Schliessen Eingabetaste druecken'
    exit 1
}

$url = "http://localhost:$Port/"

Write-Host ''
Write-Host '  ############################################################'
Write-Host '  #                                                          #'
Write-Host '  #            B A U S T E L L E N D I S P O S I T I O N     #'
Write-Host '  #                                                          #'
Write-Host '  ############################################################'
Write-Host ''
Write-Host "   Tafel:          $url" -ForegroundColor Green
Write-Host "   Hallenansicht:  $url#tv" -ForegroundColor Cyan
Write-Host ''
Write-Host '   Dieses Fenster muss offen bleiben, solange die Tafel laeuft.'
Write-Host '   Zum Beenden das Fenster schliessen oder Strg+C druecken.'
Write-Host ''

if (-not $NoBrowser) {
    Start-Process $url | Out-Null
}

function Send-Response {
    param(
        [System.Net.Sockets.NetworkStream]$Stream,
        [int]$Status,
        [string]$StatusText,
        [string]$ContentType,
        [byte[]]$Body
    )
    $head = "HTTP/1.1 $Status $StatusText`r`n" +
            "Content-Type: $ContentType`r`n" +
            "Content-Length: $($Body.Length)`r`n" +
            "Cache-Control: no-cache`r`n" +
            "Connection: close`r`n`r`n"
    $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
    $Stream.Write($headBytes, 0, $headBytes.Length)
    if ($Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
    $Stream.Flush()
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 5000
            $client.SendTimeout = 15000
            $stream = $client.GetStream()

            # Nur die erste Zeile der Anfrage wird gebraucht
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()

            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                $client.Close()
                continue
            }

            $parts = $requestLine -split ' '
            $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }

            # Query und Raute abschneiden, Prozentkodierung aufloesen
            $rawPath = ($rawPath -split '\?')[0]
            $rawPath = ($rawPath -split '#')[0]
            $rawPath = [System.Uri]::UnescapeDataString($rawPath)

            if ($rawPath -eq '/' -or $rawPath -eq '') { $rawPath = '/index.html' }

            $relative = $rawPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $full = [System.IO.Path]::GetFullPath((Join-Path $Root $relative))

            # Ausbruch aus dem Wurzelverzeichnis verhindern
            if (-not $full.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes('Verboten')
                Send-Response -Stream $stream -Status 403 -StatusText 'Forbidden' -ContentType 'text/plain; charset=utf-8' -Body $body
                $client.Close()
                continue
            }

            # Einzelseiten-Anwendung: unbekannte Adressen auf index.html zurueckfallen
            # lassen, damit auch /tv funktioniert.
            if (-not (Test-Path $full -PathType Leaf)) {
                $full = Join-Path $Root 'index.html'
            }

            $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
            $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($full)

            Send-Response -Stream $stream -Status 200 -StatusText 'OK' -ContentType $type -Body $bytes
        } catch {
            # Eine einzelne kaputte Verbindung darf den Server nicht beenden
        } finally {
            try { $client.Close() } catch {}
        }
    }
} finally {
    $listener.Stop()
}
