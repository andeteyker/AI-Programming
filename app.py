"""Flask application serving a simple Chess dashboard."""
from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from typing import Dict

from flask import Flask, Response, jsonify, render_template, request


@dataclass
class ScoreBoard:
    """Thread-safe in-memory scoreboard for the Chess game."""

    white_wins: int = 0
    black_wins: int = 0
    draws: int = 0
    _lock: Lock = field(default_factory=Lock, repr=False)

    def to_dict(self) -> Dict[str, int]:
        return {
            "whiteWins": self.white_wins,
            "blackWins": self.black_wins,
            "draws": self.draws,
        }

    def update(self, result: str) -> Dict[str, int]:
        """Update the stored results counter based on the game outcome."""

        normalized = (result or "").strip().lower()
        with self._lock:
            if normalized == "white":
                self.white_wins += 1
            elif normalized == "black":
                self.black_wins += 1
            elif normalized == "draw":
                self.draws += 1
            else:
                raise ValueError("Ungültiges Spielergebnis")

            return self.to_dict()


app = Flask(__name__)
scoreboard = ScoreBoard()


@app.route("/")
def index() -> str:
    """Render the dashboard with the embedded chess experience."""
    return render_template("index.html")


@app.route("/api/results", methods=["GET", "POST"])
def results() -> Response:
    """Retrieve or update the aggregated results for finished chess games."""
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        result = payload.get("result")
        try:
            updated = scoreboard.update(result)
        except ValueError:
            return jsonify({"error": "Ergebnis muss 'white', 'black' oder 'draw' sein."}), 400

        return jsonify(updated)

    return jsonify(scoreboard.to_dict())


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
