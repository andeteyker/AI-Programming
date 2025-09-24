"""Flask application serving a simple Snake dashboard."""
from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from typing import Dict

from flask import Flask, Response, jsonify, render_template, request


@dataclass
class ScoreBoard:
    """Thread-safe in-memory scoreboard for the Snake game."""

    high_score: int = 0
    _lock: Lock = field(default_factory=Lock, repr=False)

    def to_dict(self) -> Dict[str, int]:
        return {"highScore": self.high_score}

    def update(self, score: int) -> int:
        """Update the stored high score if the provided score is higher."""
        with self._lock:
            if score > self.high_score:
                self.high_score = score
            return self.high_score


app = Flask(__name__)
scoreboard = ScoreBoard()


@app.route("/")
def index() -> str:
    """Render the dashboard with the embedded Snake game."""
    return render_template("index.html")


@app.route("/api/high-score", methods=["GET", "POST"])
def high_score() -> Response:
    """Retrieve or update the high score for the Snake game."""
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        score = payload.get("score", 0)
        try:
            score_value = int(score)
        except (TypeError, ValueError):
            return jsonify({"error": "Score muss eine Ganzzahl sein."}), 400

        updated_high_score = scoreboard.update(score_value)
        return jsonify({"highScore": updated_high_score})

    return jsonify(scoreboard.to_dict())


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
