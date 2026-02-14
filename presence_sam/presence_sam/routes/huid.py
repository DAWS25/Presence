"""Human-readable ID generator.

Format: adjective-adjective-place
Words are common English.
"""

from __future__ import annotations

import random
from pathlib import Path

_DATA_DIR = Path(__file__).parent


def _load_words(filename: str) -> tuple[str, ...]:
	"""Load words from a text file, one word per line."""
	with (_DATA_DIR / filename).open() as f:
		return tuple(line.strip() for line in f if line.strip())


ADJECTIVES = _load_words("_adjectives.txt")
PLACES = _load_words("_places.txt")


def generate_human_id() -> str:
	"""Generate a human-readable ID in adjective-adjective-place format."""

	adj1 = random.choice(ADJECTIVES)
	adj2 = random.choice(ADJECTIVES)
	place = random.choice(PLACES)
	return f"{adj1}-{adj2}-{place}"

