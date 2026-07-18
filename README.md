# Urlaubsplaner Berlin – Version 2.0

GitHub-Pages-kompatible statische Web-App.

## Neu in Version 2.0

- separate Auswahl von Plan-Gruppe und konkreter Abteilung in der Mitarbeiterverwaltung
- eine Plan-Gruppe filtert die auswählbaren Abteilungen
- Mitarbeitende bleiben immer einer konkreten Abteilung zugeordnet
- Plan-Gruppe wird zusätzlich gespeichert und im Monatsplan berücksichtigt
- gruppierte Einzelabteilungen werden im Monatsplan nicht zusätzlich angezeigt
- datierte Abteilungs- und Plan-Gruppenwechsel innerhalb eines Jahres
- Plan-Gruppenansicht berücksichtigt alte und neue Zuordnungen stabil
- installierbare Progressive Web App für Desktop und Android
- Offline-Cache für die statischen App-Dateien

## Installation auf dem Desktop

Nach Veröffentlichung über GitHub Pages erscheint in Chrome oder Edge die Schaltfläche **App installieren** beziehungsweise ein Installationssymbol in der Adresszeile.

## Aktualisierung

Alle Dateien direkt in den Hauptordner des GitHub-Repositories laden und vorhandene Dateien überschreiben. Anschließend einmal `Strg + F5` verwenden.


## Neu in Version 2.0

- Kritischer Datenfehler behoben: Plan-Gruppen, Gruppenzuordnungen und weitere Einstellungen werden beim Neuladen nicht mehr aus dem LocalStorage entfernt.
- Plan-Gruppen können unabhängig von einer Abteilung angelegt werden.
- Plan-Gruppen erscheinen zuverlässig in der Mitarbeiter- und Abteilungsverwaltung.
- Plan-Gruppen können gelöscht werden, sobald keine Abteilung mehr zugeordnet ist.
- Urlaube können im Monatsplan genehmigt oder abgelehnt werden.
- Abgelehnte Urlaube werden rot dargestellt und mit „Muss verschoben werden“ gekennzeichnet.
- Benutzerseite enthält eine Legende der Rollen und Berechtigungen.
- GitHub Pages und installierbare PWA bleiben unterstützt.
