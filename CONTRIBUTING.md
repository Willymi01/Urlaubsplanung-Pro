# Mitentwicklung

## Empfohlener Ablauf

1. Repository klonen.
2. Einen Arbeitsbranch erstellen: `git switch -c feature/kurze-beschreibung`.
3. Änderungen umsetzen und mit `pytest -q` testen.
4. Kleine, verständliche Commits erstellen.
5. Den Branch pushen und einen Pull Request nach `main` öffnen.

## Branch-Namen

- `feature/...` für neue Funktionen
- `fix/...` für Fehlerbehebungen
- `docs/...` für Dokumentation
- `chore/...` für Wartungsarbeiten

## Commit-Beispiele

- `feat: Abteilungsverwaltung ergänzen`
- `fix: PIN-Sperre korrekt zurücksetzen`
- `docs: Docker-Start erklären`

Geheimnisse, `.env`-Dateien und Datenbanken dürfen nicht eingecheckt werden.
