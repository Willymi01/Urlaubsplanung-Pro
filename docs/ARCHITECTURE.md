# Architektur

## Aktueller Stand

Phase 1 ist eine serverseitig gerenderte Web-App auf Basis von FastAPI, Jinja2 und SQLAlchemy.

```text
Browser
  |
  v
FastAPI-Anwendung (backend/app)
  |
  v
SQLAlchemy
  |
  v
SQLite lokal / später PostgreSQL zentral
```

## Verzeichnisstruktur

- `backend/app`: Anwendung, Datenmodelle, Sicherheit, Templates und Styles
- `backend/tests`: automatisierte Tests
- `data`: lokale Entwicklungsdaten; echte Daten werden nicht in Git eingecheckt
- `docker`: Container-Konfiguration
- `docs`: Architektur, Roadmap und fachliche Dokumentation
- `.github/workflows`: automatische Tests bei Push und Pull Request

## Geplante Entwicklung

Eine separate Frontend-Anwendung wird erst eingeführt, wenn die Bedienoberfläche dies fachlich rechtfertigt. Bis dahin verhindert die serverseitige Struktur unnötige Komplexität.
