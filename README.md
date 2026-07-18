# Urlaubsplaner – Version 0.2

Statische GitHub-Pages-Version ohne Server und ohne Datenbank.

## Testzugang

- Name: `Admin`
- PIN: `1234`

## Neu in Version 0.2

- Wochenübersicht je Abteilung
- Berliner Feiertage im Kalender
- Berechnung geplanter Arbeitstage und Resturlaub
- Urlaubseinträge können gelöscht werden
- CSV-Export für Excel
- JSON-Datensicherung mit Import und Export
- Nächste Abwesenheiten auf dem Dashboard
- verbesserte Leiter- und Fairnessübersicht

## GitHub Pages

Lade **alle Dateien aus diesem Ordner direkt in den Hauptordner deines Repositorys**. Die `index.html` muss im Hauptordner liegen.

Danach entweder:

1. **Settings → Pages → Deploy from a branch**
2. Branch `main`, Ordner `/ (root)`

oder unter **Settings → Pages** die Quelle **GitHub Actions** wählen. Der beiliegende Workflow veröffentlicht die Seite automatisch.

## Hinweis

Die Daten werden im `localStorage` des Browsers gespeichert. Sie sind deshalb noch nicht zwischen mehreren Geräten oder Benutzern synchronisiert.
