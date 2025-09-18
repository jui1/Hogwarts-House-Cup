import json
import random
import time
import uuid
from datetime import datetime, timezone

CATEGORIES = ["Gryff", "Slyth", "Raven", "Huff"]


def generate_record():
    """Generate a single random house points record."""
    return {
        "id": str(uuid.uuid4()),
        "category": random.choice(CATEGORIES),
        "points": random.randint(1, 100),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def record_stream(delay_range=(0.5, 2)):
    """
    Generator that yields records indefinitely
    """
    while True:
        record = generate_record()
        yield record
        time.sleep(random.uniform(*delay_range))


if __name__ == "__main__":
    # Example usage
    for rec in record_stream():
        print(json.dumps(rec), flush=True)
