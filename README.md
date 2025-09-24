# Schach Dashboard

Ein interaktives Dashboard mit Python-Backend und moderner Browser-Oberfläche,
in dem du komplette Schachpartien direkt im Browser spielen kannst. Ergebnisse
werden serverseitig gespeichert, während das Frontend dir den aktuellen
Spielstand, den Zugverlauf und hilfreiche Aktionen präsentiert.

## Features

- ♟️ Vollwertiges Schachbrett mit legalen Zügen inklusive Rochade,
  en-passant und Umwandlungen
- 📈 Dashboard mit Siegstatistik (Weiß, Schwarz, Remis) und dynamischem
  Zugverlauf
- ☁️ Serverseitige Ergebnis-API auf Basis von Flask
- 🧠 Komfortfunktionen wie Aufgabe, Remisangebot und Neustart-Schaltfläche
- 🎨 Dunkles, responsives UI-Design, optimiert für Desktop und Tablet

## Voraussetzungen

- Python 3.10 oder neuer
- Virtuelle Umgebung (empfohlen)

## Installation

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Anwendung starten

```bash
python app.py
```

Die Anwendung ist anschließend unter <http://localhost:5000> erreichbar. Öffne
die Seite im Browser, um sofort loszuspielen.

## Steuerung

- Klicke eine eigene Figur, um ihre legalen Züge hervorzuheben
- Klicke ein Ziel-Feld, um den Zug auszuführen
- Nutze die Aktionsbuttons für Aufgabe, Remis oder Neustart

## API-Endpunkte

| Methode | Pfad           | Beschreibung                                      |
| ------- | -------------- | ------------------------------------------------- |
| GET     | `/api/results` | Liefert die aggregierten Ergebnisse aller Partien |
| POST    | `/api/results` | Aktualisiert die Statistik nach einer beendeten Partie |

Die Ergebnisverwaltung ist in-memory umgesetzt und wird beim Neustart der
Anwendung zurückgesetzt.
