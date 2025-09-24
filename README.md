# Snake Dashboard

Ein interaktives Dashboard mit Python-Backend und moderner Browser-Oberfläche,
in dem du das klassische Snake spielen kannst. Der Highscore wird serverseitig
verwaltet, während das Frontend Statistiken wie Score und Geschwindigkeit in
Echtzeit aktualisiert.

## Features

- 🎮 Snake-Spiel im Canvas mit weicher Steuerung per Pfeiltasten oder WASD
- 📈 Dashboard mit aktuellen Kennzahlen (Score, Highscore, Geschwindigkeit)
- ☁️ Serverseitige Highscore-API auf Basis von Flask
- 🧠 Pausenfunktion, Neustart-Schaltfläche und stetig steigende Geschwindigkeit
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
die Seite im Browser, um das Spiel im Dashboard zu spielen.

## Steuerung

- Pfeiltasten oder **WASD** zum Steuern der Schlange
- **Leertaste** zum Pausieren bzw. Fortsetzen
- **Neu starten**-Button auf dem Dashboard setzt das Spiel zurück

## API-Endpunkte

| Methode | Pfad             | Beschreibung                               |
| ------- | ---------------- | ------------------------------------------ |
| GET     | `/api/high-score` | Liefert den aktuell gespeicherten Highscore |
| POST    | `/api/high-score` | Aktualisiert den Highscore mit einem Score  |

Die Highscore-Verwaltung ist in-memory umgesetzt und wird beim Neustart der
Anwendung zurückgesetzt.
