# Urlaubsplaner v4.1 – Supabase + installierbare PWA

## Was enthalten ist

- vollständige bisherige Urlaubsplaner-Oberfläche
- installierbare PWA für Edge und Chrome
- GitHub Pages kompatibel, auch als Projektseite
- lokales Speichern nach jeder Änderung
- automatische Supabase-Synchronisierung
- Revisionsschutz gegen gegenseitiges Überschreiben
- serverseitige Sicherung der letzten 50 Datenstände
- vollständige Speicherung von Mitarbeitern, Urlauben, Plan-Gruppen, Gruppen-Maxima, Abteilungsgrenzen, Leiter-Maximum, Schlüssel-Leiter-Regel, Benutzern und Änderungsprotokoll

## 1. Supabase vorbereiten

1. Ein Supabase-Projekt öffnen.
2. Im SQL Editor den gesamten Inhalt von `supabase/schema.sql` ausführen.
3. Unter Project Settings / API die Projekt-URL und den Publishable Key kopieren. Bei älteren Projekten kann stattdessen der `anon` Key verwendet werden.
4. Niemals einen Secret- oder Service-Role-Key in die App eintragen.

## 2. GitHub Pages veröffentlichen

Alle Dateien aus diesem Ordner in das GitHub-Repository hochladen. In GitHub unter Settings → Pages die Veröffentlichung aus dem Hauptbranch aktivieren und HTTPS verwenden.

## 3. Ersten Datenstand übertragen

Auf dem Rechner/Browser, in dem die bisherigen echten Daten vorhanden sind:

1. Neue GitHub-Pages-Version öffnen.
2. Prüfen, ob Mitarbeiter, Urlaube, Plan-Gruppen und Grenzwerte sichtbar sind.
3. Als Administrator die Datenzentrale öffnen.
4. Supabase-Projekt-URL, Publishable Key und einen gemeinsamen Zugriffscode mit mindestens 8 Zeichen eintragen.
5. Verbindung testen.
6. „Lokale Daten zu Supabase senden“ anklicken.
7. Erst danach auf anderen PCs „Daten aus Supabase laden“ verwenden.

## 4. Als App installieren

In Edge oder Chrome erscheint in der Adressleiste die Installationsschaltfläche. Alternativ steht nach unterstützter Erkennung oben in der App „App installieren“.

## Sicherheit

Der Publishable Key darf in einer Browser-App verwendet werden; der Secret-/Service-Role-Key darf niemals veröffentlicht werden. Der zusätzliche Zugriffscode wird in Supabase nur als bcrypt-Hash gespeichert. Die GitHub-Dateien enthalten keine Beschäftigtendaten.

## Updates

Bei späteren GitHub-Updates nur Programmdateien ersetzen. Der Supabase-Datenstand bleibt erhalten. Vor größeren Änderungen zusätzlich über „Datensicherung“ eine JSON-Sicherung exportieren.


## Version 4.2 – automatische Supabase-Synchronisierung

Nach dem Aktivieren von **„Automatisch speichern und Änderungen anderer PCs laden“**:

- wird jede lokale Änderung nach etwa 1,2 Sekunden zu Supabase gespeichert,
- wird beim Start der App automatisch der neuere Online-Datenstand geladen,
- prüft die App alle 15 Sekunden auf Änderungen anderer PCs,
- prüft sie zusätzlich beim Wechsel zurück in die App und nach Wiederherstellung
  der Internetverbindung,
- werden vorhandene lokale, noch nicht hochgeladene Änderungen niemals
  automatisch durch Onlinedaten überschrieben.

Auf jedem PC müssen Projekt-URL, Publishable Key, Zugriffscode und die
Automatik einmal gespeichert werden. Diese Zugangsdaten bleiben im jeweiligen
Browserprofil gespeichert.
