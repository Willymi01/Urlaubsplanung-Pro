from app.security import hash_pin, validate_pin, verify_pin


def test_pin_hash_roundtrip():
    hashed = hash_pin("4826")
    assert verify_pin("4826", hashed)
    assert not verify_pin("4827", hashed)
    assert "4826" not in hashed


def test_pin_validation():
    assert validate_pin("4826")[0]
    assert not validate_pin("1111")[0]
    assert not validate_pin("12ab")[0]
    assert not validate_pin("123")[0]
