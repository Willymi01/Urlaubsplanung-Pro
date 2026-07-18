# Optionales Backend v0.9

Dieses Backend ermöglicht die gemeinsame Speicherung mehrerer Geräte. GitHub Pages kann es nicht ausführen; es muss separat auf einem Node.js-Host betrieben werden.

Umgebungsvariablen:
- `PORT` – wird meist vom Hosting gesetzt
- `SYNC_TOKEN` – gemeinsamer Zugriffsschlüssel
- `ALLOWED_ORIGIN` – Adresse der GitHub-Pages-Webseite, alternativ `*`
- `DATA_FILE` – optionaler Speicherpfad

Start: `npm start`

Für einen echten Produktivbetrieb ab v1.0 sind PostgreSQL, verschlüsselte Passwörter, Benutzer-Sitzungen und regelmäßige Sicherungen vorgesehen.
