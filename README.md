# Urlaubsplaner

Web-Anwendung zur Urlaubsplanung für einen Einzelhandelsbetrieb mit ungefähr zehn Abteilungen und 60 Mitarbeitern.

## Projektstruktur

```text
urlaubsplaner/
├── backend/
│   ├── app/
│   ├── tests/
│   └── requirements.txt
├── data/
├── docker/
│   └── Dockerfile
├── docs/
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
├── .github/workflows/ci.yml
├── docker-compose.yml
└── README.md
```

## Lokal unter Windows starten

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
copy .env.example .env
cd backend
uvicorn app.main:app --reload
```

Danach `http://localhost:8000` öffnen.

Erster Entwicklungszugang:

```text
Name: Admin
PIN: 1234
```

Die PIN muss bei der ersten Anmeldung geändert werden. Vor einem produktiven Einsatz müssen die Werte in `.env` angepasst werden.

## Mit Docker starten

```bash
cp .env.example .env
docker compose up --build -d
```

Die Datenbank liegt in einem Docker-Volume und wird nicht in Git gespeichert.

## Tests

```bash
cd backend
pytest -q
```

## In ein bestehendes Git-Repository kopieren

Den Inhalt dieses Ordners in den vorhandenen Projektordner kopieren. Den bestehenden `.git`-Ordner nicht löschen. Danach:

```bash
git status
git add .
git commit -m "chore: professionelle Projektstruktur für Phase 1"
git push
```

## Hinweise

- Git verwaltet nur Quellcode und Dokumentation.
- `.env`, Datenbanken und echte Personaldaten gehören nicht ins Repository.
- Für mehrere Rechner wird die App zentral betrieben; alle Nutzer greifen per Browser darauf zu.
