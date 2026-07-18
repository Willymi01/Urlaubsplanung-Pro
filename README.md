# Urlaubsplaner Berlin – Version 2.0

## Wichtigste Änderung: Updates ohne Datenverlust

Die Anwendung verwendet ab Version 2.0 dauerhaft den Browser-Speicher:

`urlaubsplaner.data`

Dieser Schlüssel bleibt bei künftigen Versionen gleich. Beim Austausch von `index.html`, `app.js`, `style.css` oder anderen Programmdateien werden daher folgende Daten nicht überschrieben:

- Mitarbeiter
- Benutzer und Rollen
- Abteilungen
- Plan-Gruppen und Gruppen-Maxima
- Urlaube und andere Abwesenheiten
- Verschiebungen
- Einstellungen
- Änderungsprotokoll

Beim ersten Start migriert Version 2.0 automatisch die umfangreichsten gefundenen Daten aus älteren Speicherständen.

## Wichtige Einschränkung von GitHub Pages

GitHub Pages kann lokale JSON-Dateien nicht aus dem Browser heraus verändern. Die Arbeitsdaten liegen deshalb weiterhin im Browser. Sie bleiben erhalten, wenn:

- dieselbe GitHub-Pages-Adresse verwendet wird,
- derselbe Browser und dasselbe Browserprofil verwendet werden,
- Browserdaten nicht gelöscht werden.

Für einen anderen PC oder Browser bitte vorher unter **Datensicherung** eine JSON-Sicherung exportieren und dort wieder importieren.

## Installation

Den Inhalt des Ordners direkt in den Hauptordner des GitHub-Repositories kopieren und vorhandene Programmdateien überschreiben. Nicht die Browserdaten löschen.
