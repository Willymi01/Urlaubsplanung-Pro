# Urlaubsplaner v1.2

Neu in v1.2:

- Abteilungen werden über die maximale Zahl gleichzeitig abwesender Urlauber gesteuert.
- Leiterplan mit maximal gleichzeitig abwesenden Leitungen.
- Rote Markierung nur noch an Tagen, an denen das eingestellte Maximum tatsächlich überschritten wird.
- Samstag ist ein normaler Arbeitstag.
- Sonntag wird deutlich dunkler hervorgehoben.
- Feiertagsnamen erscheinen in der Kalenderüberschrift, im Hinweisbereich und beim Überfahren einer Zelle.
- Hinweise auf Feiertage bis zu zwei Tage vor Urlaubsbeginn oder nach Urlaubsende erscheinen in der Urlaubsliste.
- Plan-Gruppen und eigene Maximalwerte je Unterabteilung bleiben erhalten.

Bestehende Daten werden automatisch übernommen. Die bisherigen Mindestbesetzungen werden bei der ersten Übernahme in passende Maximalwerte umgerechnet.

## Version 1.4
- Feiertagshinweis je Mitarbeiter erst ab mehr als zwei zugeordneten Feiertagen im Kalenderjahr.
- Feiertage im Urlaub sowie bis zu zwei Tage davor oder danach werden gezählt.
- Direkter PDF-Download des Monatsplans.
- Testzugang-Hinweis auf der Anmeldung entfernt.
- Plan-Gruppen sind im Monatsplan auswählbar und besitzen ein eigenes Gesamtmaximum für gleichzeitig abwesende Urlauber.


## Korrekturen in Version 1.4

- Plan-Gruppen lösen zugeordnete Abteilungen tolerant gegenüber Leerzeichen und Groß-/Kleinschreibung auf.
- Mitarbeiter aller Unterabteilungen werden im gemeinsamen Monatsplan angezeigt und nach Abteilung getrennt.
- Warnungen basieren ausschließlich auf maximal gleichzeitig abwesenden Urlaubern.
- Keine fehlerhafte 0-von-0- oder Mindestbesetzungswarnung mehr.
- PDF-Export direkt aus den Planungsdaten mit Namen, Tageszahlen, Farben, Kürzeln und Abteilungsblöcken.
- PDF-Folgeseiten bei vielen Mitarbeitern.


## Korrekturen in Version 1.6

- Plan-Gruppen finden Mitarbeiter auch bei abweichenden Leerzeichen oder Groß-/Kleinschreibung der Abteilungsnamen.
- Gruppen werden im Auswahlfeld über feste IDs angesprochen.
- Alte Gruppen-Namenszuordnungen werden automatisch repariert.
- Beim Wechsel zum Monatsplan werden Wochentage, Feiertage und Abwesenheiten sofort vollständig gerendert.
- Versionsparameter an CSS und JavaScript verhindern, dass GitHub Pages veraltete Dateien aus dem Browser-Cache verwendet.
