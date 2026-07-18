# Urlaubsplaner Berlin – Version 0.9

## Neu
- Datenzentrale für optionale gemeinsame Serverdaten
- Verbindungstest zum Backend
- Daten zum Server senden und vom Server laden
- Erkennung noch nicht synchronisierter lokaler Änderungen
- Konfliktwarnung vor dem Überschreiben lokaler Daten
- optionaler automatischer Abgleich nach Änderungen
- Gerätekennung und letzter Synchronisierungszeitpunkt
- mitgeliefertes kleines Node.js-Backend im Ordner `backend`
- automatische Übernahme lokaler Daten aus Version 0.8

## GitHub Pages
Alle Dateien aus dem Hauptordner direkt in das Repository kopieren. Der Ordner `backend` darf mit hochgeladen werden, läuft dort aber nicht. Die Webseite funktioniert weiterhin vollständig im lokalen Modus.

## Testzugänge
- Admin / 1234
- Marktleitung / 5678
- Anna Schmidt / 1111
- Tom Wagner / 2222

## Wichtiger Hinweis
Die PIN-Anmeldung im GitHub-Pages-Modus ist weiterhin nur eine Demonstration. Erst mit einem produktiven Backend können Anmeldung, Rechte und Daten zentral und sicher umgesetzt werden.


## Neu in v0.9.1
- Verschobene Urlaube werden im Monats- und Leiterplan rosa mit ↔ dargestellt.
- Der frühere Reiter „Verschiebungen“ wurde aus der Navigation entfernt; die Informationen bleiben im Plan und Änderungsprotokoll erhalten.
- Neue Abwesenheitsart „Geplanter Freier Tag“ mit Kürzel G.
