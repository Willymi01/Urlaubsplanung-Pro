# Sicherheit

Sicherheitsprobleme bitte nicht öffentlich als Issue mit Zugangsdaten oder personenbezogenen Daten veröffentlichen.

Vor einem produktiven Einsatz müssen mindestens folgende Werte geändert werden:

- `ADMIN_PIN`
- `SESSION_SECRET`
- `HTTPS_ONLY=true`, sobald die Anwendung über HTTPS erreichbar ist

Die Datei `.env` und der Ordner `data/` sind von Git ausgeschlossen. Datenbanksicherungen müssen getrennt und geschützt gespeichert werden.
