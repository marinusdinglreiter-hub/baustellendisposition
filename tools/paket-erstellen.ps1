<#
    Schnuert das Paket, das auf einem anderen Rechner ohne jede Installation
    laeuft: die gebaute Anwendung, der kleine Webserver und der Starter.

    Vorher muss `npm run build` gelaufen sein (macht `npm run paket` selbst).
#>

$ErrorActionPreference = 'Stop'

$projekt = Split-Path $PSScriptRoot -Parent
$dist    = Join-Path $projekt 'dist'
$ziel    = Join-Path $projekt 'Baustellendisposition-Paket'
$zip     = Join-Path $projekt 'Baustellendisposition-Paket.zip'

if (-not (Test-Path $dist)) {
    Write-Host 'Der Ordner dist fehlt - bitte zuerst "npm run build" ausfuehren.' -ForegroundColor Red
    exit 1
}

# Alten Stand wegraeumen
if (Test-Path $ziel) { Remove-Item $ziel -Recurse -Force }
if (Test-Path $zip)  { Remove-Item $zip -Force }

New-Item -ItemType Directory -Path $ziel -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $ziel 'tools') -Force | Out-Null

Copy-Item $dist (Join-Path $ziel 'dist') -Recurse
Copy-Item (Join-Path $PSScriptRoot 'serve.ps1') (Join-Path $ziel 'tools\serve.ps1')
Copy-Item (Join-Path $projekt 'Baustellendisposition starten.cmd') $ziel

$anleitung = @'
BAUSTELLENDISPOSITION
=====================

So startest du die Tafel auf diesem Rechner:

  1. Doppelklick auf "Baustellendisposition starten.cmd"
  2. Es oeffnet sich ein schwarzes Fenster und daneben der Browser.

Das schwarze Fenster MUSS offen bleiben, solange du die Tafel benutzt -
darin laeuft der kleine Webserver. Zum Beenden das Fenster schliessen.

  Tafel:          http://localhost:5174/
  Hallenansicht:  http://localhost:5174/#tv

Ist der Port 5174 schon belegt, sucht das Programm selbst den naechsten
freien Port und schreibt die richtige Adresse ins schwarze Fenster.

Es muss nichts installiert werden. Der Webserver ist ein PowerShell-Skript,
das Windows von Haus aus ausfuehren kann. Er hoert nur auf diesen Rechner
(127.0.0.1) und ist aus dem Netz nicht erreichbar.


VERWALTUNG
----------
Die Verwaltung ist mit einer PIN gesperrt: 1234
Aenderbar unten in der Verwaltung. Die PIN gilt nur fuer diesen Rechner.


DATEN
-----
Dieser Rechner faengt mit Beispieldaten an.

Echte Daten uebernehmen: auf dem Rechner mit den richtigen Daten unter
Verwaltung -> Verlauf exportieren, die JSON-Datei herueberkopieren und hier
unter Verwaltung -> Verlauf wieder importieren.

Die abgelegten PDF-Plaene wandern dabei NICHT mit. Die liegen im Browser
des jeweiligen Rechners. Im Export steht nur der Eintrag; hier erscheint die
Zeile dann ausgegraut mit dem Hinweis "nicht auf diesem Geraet".
'@

Set-Content -Path (Join-Path $ziel 'ANLEITUNG.txt') -Value $anleitung -Encoding utf8

Compress-Archive -Path "$ziel\*" -DestinationPath $zip -Force

$groesse = [Math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host ''
Write-Host '  Paket fertig:' -ForegroundColor Green
Write-Host "    Ordner: $ziel"
Write-Host "    Archiv: $zip  ($groesse MB)"
Write-Host ''
Write-Host '  Das Archiv an den Kollegen schicken. Er entpackt es und'
Write-Host '  startet "Baustellendisposition starten.cmd".'
Write-Host ''
