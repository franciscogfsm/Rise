"""The agent never forwards key-like strings to the AI, and only opens known pages."""
from rise import agent


def test_redact_keys_but_keep_urls():
    out = agent.redact("key AKIAIOSFODNN7EXAMPLE secret wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY "
                       "repo https://github.com/ucapistranmtz/s3PresignedUrl_v3 garage GK31c2f218a2e44f485b94239e")
    assert "AKIA" not in out and "wJalr" not in out and "GK31" not in out
    assert "https://github.com/ucapistranmtz/s3PresignedUrl_v3" in out


def test_open_page_whitelist():
    assert agent.PATH.match("/connect") and agent.PATH.match("/a/0123456789")
    assert not agent.PATH.match("//evil.com") and not agent.PATH.match("/api/connections")
