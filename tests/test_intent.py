from rise import agent

TOKEN = "ghp_" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4"


def test_intent_strips_token_and_validates_ai(monkeypatch):
    seen = {}

    def fake_call(system, user, name, schema):
        seen["user"] = str(user)
        return {"reference": "source", "targets": ["destination", "nope", "source"], "goal": "Leave AWS"}, {"ms": 5}

    monkeypatch.setattr(agent.ai, "_call", fake_call)
    out = agent.intent(f"github.com/acme/shop.git {TOKEN} leave AWS for Europe")
    assert out["url"] == "https://github.com/acme/shop"
    assert TOKEN not in seen["user"] and "acme" not in seen["user"]
    assert out["by"] == "ai" and out["reference"] == "source" and out["targets"] == ["destination"]  # unknown ids dropped


def test_intent_works_without_ai(monkeypatch):
    def down(*a):
        raise RuntimeError("no key")

    monkeypatch.setattr(agent.ai, "_call", down)
    out = agent.intent("https://github.com/acme/shop move it")
    assert out["by"] == "rules" and out["url"] == "https://github.com/acme/shop" and out["targets"]
    assert out["reference"] not in out["targets"]
